//
//  AppDelegate.swift
//  LDOC Free Viewer (iOS)
//  Copyright (c) 2026 J-AI-ENTERPRISES. All Rights Reserved.
//

import UIKit

@main
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        window = UIWindow(frame: UIScreen.main.bounds)
        window?.rootViewController = ViewController()
        window?.makeKeyAndVisible()
        return true
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey : Any] = [:]) -> Bool {
        if let rootVC = window?.rootViewController as? ViewController {
            rootVC.loadFileIntoViewer(url: url)
            return true
        }
        return false
    }
}
