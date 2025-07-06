# WebView with Haptic Feedback - Specification

## 概要

この `WebView` コンポーネントは、SwiftUI 上で `WKWebView` をラップし、JavaScript 側からのメッセージによって Swift 側でハプティック（バイブ）を発火させる機能を提供します。

主な用途：

* Web フロントエンドとネイティブの連携
* ボタンタップやアクションに応じたネイティブフィードバック
* カスタム User-Agent による WebView 識別

---

## 構成要素

### SwiftUI: `WebView`

```swift
WebView(
  url: URL,                  // 表示するWebページのURL
  isLoading: Binding<Bool>, // 読み込み状態（外部から監視用）
  progress: Binding<Double> // 読み込み進捗（0.0 ~ 1.0）
)
```

* `UIViewRepresentable` を継承し、内部に `WKWebView` を構築
* 読み込み開始・終了時に `isLoading` を更新
* `estimatedProgress` を監視して `progress` を更新
* カスタム User-Agent: `ToppifyGO-App iOS`

---

### JavaScript から Swift への呼び出し（ハプティック）

#### 目的

Web 側でのイベント発生時に、Swift 側のバイブ（ハプティック）をトリガーする。

#### JS 側コード例

```javascript
// Swift 側にハプティックを要求する（追加の引数なし）
window.webkit.messageHandlers.hapticFeedback.postMessage(null);
```

#### Swift 側処理

* `WKUserContentController` に `"hapticFeedback"` を登録
* `message.name == "hapticFeedback"` のとき `UIImpactFeedbackGenerator(style: .medium)` による振動を実行

---

## 技術仕様

| 項目              | 内容                                          |
| --------------- | ------------------------------------------- |
| SwiftUI互換       | ✅ `UIViewRepresentable` 経由で組み込み可能           |
| JavaScript連携    | ✅ `WKScriptMessageHandler` 経由で受信            |
| ハプティックの強さ       | `UIImpactFeedbackGenerator(style: .medium)` |
| 読み込み進捗取得        | `WKWebView.estimatedProgress` をKVO監視        |
| ズーム制御           | ピンチ無効・マルチタッチ無効化済                            |
| カスタム User-Agent | `"ToppifyGO-App iOS"` に設定                   |

---

## 使用上の注意

* JavaScript 側は iOS 環境（`window.webkit` が存在する環境）でのみ動作します。
* ハプティックフィードバックは実機でのみ動作します（シミュレータ不可）。
* Web サーバー側で `Content-Security-Policy` を正しく設定していることが望ましい。

---

## 拡張のヒント

* `postMessage("light")`, `postMessage("heavy")` などで強さを切り替えるよう改修可能
* 他の機能（音再生、アラート表示など）を `WKScriptMessageHandler` に追加可能
* Swift → JS の双方向通信も `evaluateJavaScript()` で実装可能
