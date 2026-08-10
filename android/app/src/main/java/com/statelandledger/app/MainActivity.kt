package com.statelandledger.app

import android.annotation.SuppressLint
import android.app.DownloadManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.provider.Settings
import android.view.KeyEvent
import android.webkit.JavascriptInterface
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.FileProvider
import java.io.File

// The whole app is the web build in assets/ (index.html, style.css, app.js, manifest.json,
// assets/*.png) running inside a single WebView. There's no native UI beyond this -- all game
// logic, state, and persistence live in app.js, using WebView's localStorage for saves.
//
// The one thing JS genuinely can't do on its own is trigger Android's package installer, so
// this activity exposes a small bridge (UpdateBridge, reachable in JS as window.AndroidUpdater)
// that downloads a given APK URL and hands it to the system installer -- the same thing every
// non-Play-Store updater (Epic's launcher, F-Droid, etc.) does under the hood.
class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private var pendingDownloadId: Long = -1L
    private var pendingApkFile: File? = null

    private val downloadReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            val id = intent?.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1L) ?: -1L
            val file = pendingApkFile
            if (id == pendingDownloadId && file != null) {
                installApk(file)
            }
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        webView = WebView(this)
        setContentView(webView)

        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true // required -- the app saves your kingdom via localStorage
            cacheMode = WebSettings.LOAD_DEFAULT
            allowFileAccess = true
        }
        webView.webViewClient = WebViewClient()
        webView.addJavascriptInterface(UpdateBridge(), "AndroidUpdater")

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(downloadReceiver, IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE), Context.RECEIVER_NOT_EXPORTED)
        } else {
            registerReceiver(downloadReceiver, IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE))
        }

        webView.loadUrl("file:///android_asset/index.html")
    }

    override fun onDestroy() {
        super.onDestroy()
        try {
            unregisterReceiver(downloadReceiver)
        } catch (e: Exception) {
            // already unregistered, or never registered -- safe to ignore
        }
    }

    override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
        if (keyCode == KeyEvent.KEYCODE_BACK && webView.canGoBack()) {
            webView.goBack()
            return true
        }
        return super.onKeyDown(keyCode, event)
    }

    private fun installApk(file: File) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && !packageManager.canRequestPackageInstalls()) {
            Toast.makeText(
                this,
                "Allow \"install unknown apps\" for this app, then tap Update again.",
                Toast.LENGTH_LONG
            ).show()
            val settingsIntent = Intent(
                Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                Uri.parse("package:$packageName")
            )
            startActivity(settingsIntent)
            return
        }
        val apkUri = FileProvider.getUriForFile(this, "$packageName.fileprovider", file)
        val installIntent = Intent(Intent.ACTION_VIEW).apply {
            setDataAndType(apkUri, "application/vnd.android.package-archive")
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
        startActivity(installIntent)
    }

    inner class UpdateBridge {
        @JavascriptInterface
        fun downloadAndInstall(apkUrl: String) {
            runOnUiThread {
                try {
                    val fileName = "kingdom-ledger-update.apk"
                    val destDir = getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS)
                    val destFile = File(destDir, fileName)
                    if (destFile.exists()) destFile.delete()

                    val request = DownloadManager.Request(Uri.parse(apkUrl)).apply {
                        setTitle("Kingdom Ledger update")
                        setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                        setDestinationInExternalFilesDir(this@MainActivity, Environment.DIRECTORY_DOWNLOADS, fileName)
                        setAllowedOverMetered(true)
                        setAllowedOverRoaming(true)
                    }
                    val downloadManager = getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
                    pendingApkFile = destFile
                    pendingDownloadId = downloadManager.enqueue(request)
                    Toast.makeText(this@MainActivity, "Downloading update...", Toast.LENGTH_SHORT).show()
                } catch (e: Exception) {
                    Toast.makeText(this@MainActivity, "Update download failed: " + e.message, Toast.LENGTH_LONG).show()
                }
            }
        }
    }
}
