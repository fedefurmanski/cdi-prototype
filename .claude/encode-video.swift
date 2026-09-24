import AVFoundation
import Foundation

// Transcodifica a H.264 con control explícito de resolución y bitrate.
// avconvert sólo ofrece presets de bitrate muy alto (~15 Mbps), inservibles
// para un vídeo de fondo que se descarga en cada visita.

let args = CommandLine.arguments
guard args.count >= 5 else {
    FileHandle.standardError.write("uso: encode <in> <out> <ancho> <kbps> [segundos]\n".data(using: .utf8)!)
    exit(2)
}
let inURL = URL(fileURLWithPath: args[1])
let outURL = URL(fileURLWithPath: args[2])
let targetW = Int(args[3])!
let kbps = Int(args[4])!
let limit = args.count > 5 ? Double(args[5]) : nil

let asset = AVURLAsset(url: inURL)
guard let track = asset.tracks(withMediaType: .video).first else { exit(3) }

let natural = track.naturalSize.applying(track.preferredTransform)
let srcW = abs(natural.width), srcH = abs(natural.height)
// Alto par, obligatorio para H.264
var targetH = Int((Double(targetW) * srcH / srcW).rounded())
if targetH % 2 != 0 { targetH += 1 }
let renderSize = CGSize(width: targetW, height: targetH)

let comp = AVMutableVideoComposition(propertiesOf: asset)
comp.renderSize = renderSize

let reader = try AVAssetReader(asset: asset)
if let limit { reader.timeRange = CMTimeRange(start: .zero, duration: CMTime(seconds: limit, preferredTimescale: 600)) }
let output = AVAssetReaderVideoCompositionOutput(
    videoTracks: asset.tracks(withMediaType: .video),
    videoSettings: [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA])
output.videoComposition = comp
output.alwaysCopiesSampleData = false
reader.add(output)

try? FileManager.default.removeItem(at: outURL)
let writer = try AVAssetWriter(outputURL: outURL, fileType: .mp4)
writer.shouldOptimizeForNetworkUse = true   // faststart: empieza a reproducir antes

let input = AVAssetWriterInput(mediaType: .video, outputSettings: [
    AVVideoCodecKey: AVVideoCodecType.h264,
    AVVideoWidthKey: targetW,
    AVVideoHeightKey: targetH,
    AVVideoCompressionPropertiesKey: [
        AVVideoAverageBitRateKey: kbps * 1000,
        AVVideoMaxKeyFrameIntervalKey: 60,
        AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel,
        AVVideoAllowFrameReorderingKey: true,
    ],
])
input.expectsMediaDataInRealTime = false
writer.add(input)

writer.startWriting()
writer.startSession(atSourceTime: .zero)
reader.startReading()

let done = DispatchSemaphore(value: 0)
let queue = DispatchQueue(label: "encode")
input.requestMediaDataWhenReady(on: queue) {
    while input.isReadyForMoreMediaData {
        guard let sample = output.copyNextSampleBuffer() else {
            input.markAsFinished()
            writer.finishWriting { done.signal() }
            return
        }
        input.append(sample)
    }
}
done.wait()

if writer.status != .completed {
    FileHandle.standardError.write("fallo: \(writer.error?.localizedDescription ?? "?")\n".data(using: .utf8)!)
    exit(1)
}
print("ok \(targetW)x\(targetH)")
