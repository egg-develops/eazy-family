import Foundation
import Capacitor
import Speech
import AVFoundation

@objc(SpeechRecognition)
public class SpeechRecognition: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "SpeechRecognition"
    public let jsName = "SpeechRecognition"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "available",           returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "start",               returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stop",                returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "isListening",         returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getSupportedLanguages", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "checkPermissions",    returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestPermissions",  returnType: CAPPluginReturnPromise),
    ]

    private var speechRecognizer: SFSpeechRecognizer?
    private var audioEngine: AVAudioEngine?
    private var recognitionRequest: SFSpeechAudioBufferRecognitionRequest?
    private var recognitionTask: SFSpeechRecognitionTask?

    @objc func available(_ call: CAPPluginCall) {
        guard let recognizer = SFSpeechRecognizer() else {
            call.resolve(["available": false])
            return
        }
        call.resolve(["available": recognizer.isAvailable])
    }

    @objc func start(_ call: CAPPluginCall) {
        if let engine = audioEngine, engine.isRunning {
            call.reject("Ongoing speech recognition")
            return
        }

        let authStatus = SFSpeechRecognizer.authorizationStatus()
        guard authStatus == .authorized else {
            call.reject("Missing speech recognition permission")
            return
        }

        AVAudioSession.sharedInstance().requestRecordPermission { granted in
            guard granted else {
                call.reject("User denied access to microphone")
                return
            }

            let language    = call.getString("language") ?? "en-US"
            let maxResults  = call.getInt("maxResults") ?? 5
            let partial     = call.getBool("partialResults") ?? false

            self.recognitionTask?.cancel()
            self.recognitionTask = nil

            self.audioEngine     = AVAudioEngine()
            self.speechRecognizer = SFSpeechRecognizer(locale: Locale(identifier: language))

            let session = AVAudioSession.sharedInstance()
            do {
                try session.setCategory(.playAndRecord, options: .defaultToSpeaker)
                try session.setMode(.default)
                try session.setActive(true, options: .notifyOthersOnDeactivation)
            } catch {
                call.reject("Could not configure audio session: \(error.localizedDescription)")
                return
            }

            self.recognitionRequest = SFSpeechAudioBufferRecognitionRequest()
            self.recognitionRequest?.shouldReportPartialResults = partial

            let inputNode  = self.audioEngine!.inputNode
            let format     = inputNode.outputFormat(forBus: 0)

            self.recognitionTask = self.speechRecognizer?.recognitionTask(
                with: self.recognitionRequest!
            ) { result, error in
                if let result = result {
                    let matches = result.transcriptions
                        .prefix(maxResults > 0 ? maxResults : 5)
                        .map { $0.formattedString }

                    if partial {
                        self.notifyListeners("partialResults", data: ["matches": matches])
                    } else {
                        call.resolve(["matches": matches])
                    }

                    if result.isFinal {
                        self.stopAudioEngine()
                        self.notifyListeners("listeningState", data: ["status": "stopped"])
                        self.recognitionTask = nil
                        self.recognitionRequest = nil
                    }
                }

                if let error = error {
                    self.stopAudioEngine()
                    self.recognitionTask = nil
                    self.recognitionRequest = nil
                    self.notifyListeners("listeningState", data: ["status": "stopped"])
                    if !partial {
                        call.reject(error.localizedDescription)
                    }
                }
            }

            inputNode.installTap(onBus: 0, bufferSize: 1024, format: format) { buffer, _ in
                self.recognitionRequest?.append(buffer)
            }

            self.audioEngine?.prepare()
            do {
                try self.audioEngine?.start()
                self.notifyListeners("listeningState", data: ["status": "started"])
                if partial {
                    call.resolve([:])
                }
            } catch {
                call.reject("Could not start audio engine: \(error.localizedDescription)")
            }
        }
    }

    @objc func stop(_ call: CAPPluginCall) {
        DispatchQueue.global(qos: .default).async {
            self.stopAudioEngine()
            self.notifyListeners("listeningState", data: ["status": "stopped"])
            call.resolve()
        }
    }

    @objc func isListening(_ call: CAPPluginCall) {
        call.resolve(["listening": audioEngine?.isRunning ?? false])
    }

    @objc func getSupportedLanguages(_ call: CAPPluginCall) {
        let languages = SFSpeechRecognizer.supportedLocales().map { $0.identifier }
        call.resolve(["languages": languages])
    }

    @objc override public func checkPermissions(_ call: CAPPluginCall) {
        let speech = SFSpeechRecognizer.authorizationStatus()
        let result: String
        switch speech {
        case .authorized:    result = "granted"
        case .denied, .restricted: result = "denied"
        default:             result = "prompt"
        }
        call.resolve(["speechRecognition": result])
    }

    @objc override public func requestPermissions(_ call: CAPPluginCall) {
        SFSpeechRecognizer.requestAuthorization { status in
            guard status == .authorized else {
                self.checkPermissions(call)
                return
            }
            AVAudioSession.sharedInstance().requestRecordPermission { granted in
                call.resolve(["speechRecognition": granted ? "granted" : "denied"])
            }
        }
    }

    private func stopAudioEngine() {
        if let engine = audioEngine, engine.isRunning {
            engine.stop()
            engine.inputNode.removeTap(onBus: 0)
            recognitionRequest?.endAudio()
        }
    }
}
