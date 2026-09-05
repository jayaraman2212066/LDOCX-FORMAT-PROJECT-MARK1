//
//  ViewController.swift
//  LDOC Free Viewer (iOS)
//  Copyright (c) 2026 J-AI-ENTERPRISES. All Rights Reserved.
//

import UIKit
import WebKit
import UniformTypeIdentifiers

class ViewController: UIViewController, WKUIDelegate, WKNavigationDelegate, UIDocumentPickerDelegate {

    var webView: WKWebView!
    var openDocButton: UIButton!

    override func viewDidLoad() {
        super.viewDidLoad()
        setupWebView()
        setupFloatingButton()
        loadLocalApp()
    }

    func setupWebView() {
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        config.preferences.setValue(true, forKey: "allowFileAccessFromFileURLs")

        webView = WKWebView(frame: view.bounds, configuration: config)
        webView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        webView.uiDelegate = self
        webView.navigationDelegate = self
        webView.scrollView.bounces = false
        webView.backgroundColor = UIColor(red: 0.06, green: 0.09, blue: 0.16, alpha: 1.0)
        view.addSubview(webView)
    }

    func setupFloatingButton() {
        openDocButton = UIButton(type: .system)
        openDocButton.setTitle(" 📂 Open .ldocx ", for: .normal)
        openDocButton.titleLabel?.font = UIFont.systemFont(ofSize: 15, weight: .bold)
        openDocButton.backgroundColor = UIColor(red: 0.01, green: 0.52, blue: 0.78, alpha: 0.95)
        openDocButton.setTitleColor(.white, for: .normal)
        openDocButton.layer.cornerRadius = 22
        openDocButton.layer.shadowColor = UIColor.black.cgColor
        openDocButton.layer.shadowOpacity = 0.35
        openDocButton.layer.shadowOffset = CGSize(width: 0, height: 4)
        openDocButton.layer.shadowRadius = 8
        openDocButton.translatesAutoresizingMaskIntoConstraints = false
        openDocButton.addTarget(self, action: #selector(openDocumentPicker), for: .touchUpInside)

        view.addSubview(openDocButton)

        NSLayoutConstraint.activate([
            openDocButton.trailingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.trailingAnchor, constant: -20),
            openDocButton.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -20),
            openDocButton.heightAnchor.constraint(equalToConstant: 44),
            openDocButton.widthAnchor.constraint(greaterThanOrEqualToConstant: 140)
        ])
    }

    func loadLocalApp() {
        guard let bundleUrl = Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "www") ??
                              Bundle.main.url(forResource: "index", withExtension: "html") else {
            print("Local index.html not found in bundle, loading fallback...")
            return
        }

        let readAccessUrl = bundleUrl.deletingLastPathComponent()
        webView.loadFileURL(bundleUrl, allowingReadAccessTo: readAccessUrl)
    }

    @objc func openDocumentPicker() {
        var types: [UTType] = [.data]
        if let ldocxType = UTType(filenameExtension: "ldocx") {
            types.append(ldocxType)
        }
        if let ldocType = UTType(filenameExtension: "ldoc") {
            types.append(ldocType)
        }

        let picker = UIDocumentPickerViewController(forOpeningContentTypes: types, asCopy: true)
        picker.delegate = self
        picker.allowsMultipleSelection = false
        present(picker, animated: true)
    }

    func documentPicker(_ controller: UIDocumentPickerViewController, didPickDocumentsAt urls: [URL]) {
        guard let fileUrl = urls.first else { return }
        loadFileIntoViewer(url: fileUrl)
    }

    func loadFileIntoViewer(url: URL) {
        do {
            let data = try Data(contentsOf: url)
            let base64String = data.base64EncodedString()
            let fileName = url.lastPathComponent
            
            let jsScript = """
            (function() {
                var rawData = atob('\(base64String)');
                var uint8Arr = new Uint8Array(rawData.length);
                for (var i = 0; i < rawData.length; i++) {
                    uint8Arr[i] = rawData.charCodeAt(i);
                }
                if (window.handleOpenedFileBuffer) {
                    window.handleOpenedFileBuffer(uint8Arr.buffer, '\(fileName)');
                } else if (window.loadLdocxArrayBuffer) {
                    window.loadLdocxArrayBuffer(uint8Arr.buffer, '\(fileName)');
                }
            })();
            """
            webView.evaluateJavaScript(jsScript) { _, error in
                if let error = error {
                    print("Error injecting document data: \(error)")
                }
            }
        } catch {
            print("Failed to read document file: \(error)")
        }
    }
}
