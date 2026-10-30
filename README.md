# PDFly — Privacy-First Local PDF Workspace

<p align="center">
  <img src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/shield-check.svg" width="64" height="64" alt="PDFly Shield Logo" />
</p>

<p align="center">
  <strong>Your PDFs never leave your device.</strong><br>
  A free, fast, beautiful, and strictly client-side PDF platform.<br>
  Zero server uploads. Zero signups. Zero tracking. Zero watermarks.
</p>

<p align="center">
  <a href="https://pdfly-five.vercel.app"><img src="https://img.shields.io/badge/Vercel%20App-pdfly--five.vercel.app-black?style=for-the-badge&logo=vercel&logoColor=white" alt="Vercel App" /></a>
  <a href="https://ssmanikandaprabu.github.io/pdfly/"><img src="https://img.shields.io/badge/GitHub%20Pages-Live%20Site-238636?style=for-the-badge&logo=github&logoColor=white" alt="GitHub Pages" /></a>
  <a href="#-privacy--security-architecture"><img src="https://img.shields.io/badge/Privacy-100%25%20Client--Side-10b981?style=for-the-badge&logo=shield" alt="100% Client-Side" /></a>
  <a href="#-features"><img src="https://img.shields.io/badge/Files%20Uploaded-0%20Bytes-6366f1?style=for-the-badge&logo=icloud" alt="0 Bytes Uploaded" /></a>
  <a href="#-automated-acceptance-testing"><img src="https://img.shields.io/badge/Engine%20Tests-11%2F11%20Passed-06b6d4?style=for-the-badge&logo=checkmarx" alt="Tests Passed" /></a>
  <a href="#-license"><img src="https://img.shields.io/badge/License-MIT-f59e0b?style=for-the-badge" alt="MIT License" /></a>
</p>

---

## ✨ Overview

**PDFly** is an offline-capable, privacy-first PDF utility designed with the visual precision of **Linear**, the typography of **Stripe**, and the sleek dark-mode surfaces of **Vercel**. 

Unlike conventional PDF web converters that upload your confidential tax returns, identity cards, medical records, and legal contracts to remote cloud servers, **PDFly performs 100% of all document processing in-memory within your browser sandbox**.

### 🛡️ Core Promises
* **100% Local Processing:** Files are read into WebAssembly and JavaScript TypedArrays (`Uint8Array`). They are never transmitted over HTTP/HTTPS.
* **Completely Free:** No paywalls, daily task quotas, artificial page limits, or forced signups.
* **No Watermarks:** Documents you process remain entirely yours without unwanted branding.
* **India-First Government Presets:** Ready-made compression targets for Aadhaar (100 KB), PAN Card (50 KB), UPSC / SSC Exam portals (1 MB), and Job Resumes / Driving Licenses (200 KB).
* **Multi-Language Interface:** Full interface support for **English**, **தமிழ் (Tamil)**, and **हिन्दी (Hindi)**.

---

## 🚀 Features

### 🗂️ 1. Organize PDF
* **Merge PDF:** Combine multiple PDF documents into a single consolidated file in any custom order.
* **Split PDF:** Split documents into individual single-page PDFs (packaged into a ZIP archive) or extract custom page ranges (e.g. `1-3, 5`).
* **Extract Pages:** Export selected pages with interactive visual thumbnail checkboxes.
* **Remove Pages:** Delete unwanted pages while keeping internal links, fonts, and vector elements intact.
* **Visual Page Reordering:** Drag, invert, or use `←` / `→` arrow buttons to reorder pages visually with live index updates.
* **Rotate Pages:** Apply 90°, 180°, or 270° clockwise rotations either to specific pages via thumbnail cards or in bulk across all, odd, or even pages.

### ⚡ 2. Optimize & Compress PDF
* **Structural Stream Deduplication:** Cleans redundant font descriptors, unused metadata, and optimizes cross-reference tables using Flate compression and PDF Object Streams.
* **Target Size Compressor:** Strict byte-targeted compression designed for government portals and job applications:
  * `50 KB` — PAN Card portal standard
  * `100 KB` — Aadhaar / Government upload limit
  * `200 KB` — Job Resumes / Driving License standard
  * `300 KB` — Admit Card standard
  * `500 KB` & `1 MB` — UPSC, SSC, and State Public Service Commission forms
  * `2 MB` — Standard legal & tender submissions

### 🔄 3. Convert PDF
* **Images to PDF:** Convert collections of JPG, PNG, and WebP photos into high-definition PDF files with orientation control (Portrait / Landscape) and fit modes.
* **PDF to Images (ZIP):** Render and export pages to crisp 300 DPI PNG or 150 DPI JPG archives client-side.

### ✍️ 4. Edit & Annotate
* **Watermark PDF:** Stamp customizable text watermarks across every page with adjustable angles (-45°, 0°, 45°), opacities (20% to 70%), and color profiles (Ruby Red, Sapphire Blue, Muted Slate).
* **Page Numbers:** Insert clean page numbering headers or footers (`Page X of Y`, `X / Y`, or simple `X`) positioned at Bottom Center, Bottom Right, or Top Right.
* **Digital Signature Pad:** Dual-mode digital signature:
  * **Draw Signature:** Responsive signature pad supporting mouse and multi-touch mobile drawing with ink colors (Black, Navy Blue, Sky Blue).
  * **Type Signature:** Type your name to automatically generate fluid cursive handwriting scripts. Stamp onto the first page, last page, or all pages.

### 🔒 5. PDF Security
* **Protect PDF:** Real **128-bit RC4 standard PDF password encryption** powered by `@pdfsmaller/pdf-encrypt-lite`. Password-protected PDFs strictly prompt for a password across Adobe Acrobat, Chrome, Firefox, Apple Preview, and PDF.js before any content can be viewed.

### 🧠 6. PDF Intelligence & Productivity
* **Extract Text (TXT):** Instant in-browser text stream extraction with 1-click clipboard copy and direct `.txt` download.
* **Zero-Copy Tool Chaining:** Seamlessly pipe an output file into another tool (e.g., Merge &rarr; Watermark &rarr; Protect) without re-uploading.
* **In-Browser Output Previewer:** High-fidelity interactive PDF viewer modal to inspect results before saving.
* **Document Inspector Card:** Live metadata viewer displaying page counts, paper format approximation (A4 vs US Letter), and exact file size.
* **Command Palette:** Keyboard-driven Quick Launcher triggered by `Ctrl + K` or `Cmd + K`.
* **Keyboard Shortcuts HUD:** Press `?` anywhere to reveal shortcut navigation.

---

## 🔒 Privacy & Security Architecture

### Zero Upload Guarantee
When you drag and drop a file into PDFly:
1. The browser's native `FileReader` API loads file bytes into a local memory buffer (`ArrayBuffer`).
2. WebAssembly / pure JavaScript engines manipulate the PDF data structures directly inside memory.
3. The resulting document is converted to an in-memory `Blob` and downloaded via a localized `blob:` object URL.
4. **No network requests containing document payload are ever transmitted.**

```
+-------------------------------------------------------------+
|                     USER BROWSER SANDBOX                    |
|                                                             |
|   +---------------+     ArrayBuffer     +---------------+   |
|   | Local PDF File| ==================> |  pdf-lib core |   |
|   +---------------+                     |               |   |
|                                         |  pdf-encrypt  |   |
|   +---------------+    Blob URL DL      |               |   |
|   |  Output File  | <================== |  pdf.js / zip |   |
|   +---------------+                     +---------------+   |
+-------------------------------------------------------------+
                             X  NO UPLOAD
                             |
                    [ Remote Cloud Server ]
```

### How to Verify Independent of PDFly
You do not have to take our word for it:
1. Open PDFly in Google Chrome, Firefox, Safari, or Microsoft Edge.
2. Press `F12` (or right-click &rarr; **Inspect**) to open Developer Tools.
3. Navigate to the **Network** tab and filter by **Fetch / XHR**.
4. Drag in a PDF and execute any operation (Merge, Compress, Protect, Watermark).
5. Notice that **zero bytes** are sent over the wire. The local telemetry counter accurately displays `0 B uploaded`.

---

## 📂 Repository Structure

```text
pdfly/
├── index.html               # Main standalone application (HTML5 + Tailwind CSS + JS)
├── package.json             # Engine dependency declarations & testing scripts
├── test-all-processors.js   # Automated Node.js acceptance test suite
├── .gitignore               # Clean git exclusions (ignores node_modules)
├── README.md                # Comprehensive documentation
└── lib/                     # Self-contained, offline vendor bundles
    ├── pdf-lib.min.js       # Core document manipulation engine (525 KB)
    ├── pdf-encrypt-lite.umd.js # Real 128-bit RC4 PDF encryption engine (29 KB)
    └── jszip.min.js         # In-memory ZIP packaging engine (97 KB)
```

---

## 💻 Local Setup & Quickstart

PDFly is completely standalone. It requires no backend database, Docker container, or build step to run.

### Option 1: Direct File Launch
Simply double-click `index.html` or open it with your favorite browser:
```bash
# Windows
start index.html

# macOS
open index.html

# Linux
xdg-open index.html
```

### Option 2: Local HTTP Server (Recommended)
Using Python:
```bash
# Python 3
python -m http.server 3000
```
Or using Node.js:
```bash
npx serve .
```
Then visit `http://localhost:3000` in your browser.

---

## 🧪 Automated Acceptance Testing

PDFly includes an automated engine test suite validating all core document operations, encryption, and bounds-checking:

```bash
node test-all-processors.js
```

### Test Suite Output:
```text
=== PDFLY ENGINE AUTOMATED ACCEPTANCE SUITE ===
✓ 1. Base Document 1 generated: 865 bytes
✓ 2. Base Document 2 (2 pages) generated: 1073 bytes
✓ 3. Merge PDF verified (Total 3 pages): 1286 bytes
✓ 4. Extract / Split page verified: 857 bytes
✓ 5. Remove Page verified (2 pages remain): 1082 bytes
✓ 6. Reorder Pages verified: 1292 bytes
✓ 7. Rotate PDF verified (90 deg): 1296 bytes
✓ 8. Watermark PDF verified: 2230 bytes
✓ 9. Page Numbers verified: 2053 bytes
✓ 10. Document Encryption verified: 2690 bytes
✓ 11. Security Audit Verified: Encrypted document strictly rejects unauthorized access

>>> ALL 11 ENGINE ACCEPTANCE TESTS (INCLUDING REAL ENCRYPTION) PASSED! <<<
```

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `Ctrl` / `Cmd` + `K` | Open Command Palette / Tool Search |
| `?` | Toggle Keyboard Shortcuts HUD |
| `Esc` | Close any active modal or return to Home |
| `Enter` | Trigger primary tool execution |

---

## 🛠️ Built With

* [pdf-lib](https://pdf-lib.js.org/) — In-memory document creation, page manipulation, and stream packing.
* [@pdfsmaller/pdf-encrypt-lite](https://github.com/pdfsmaller/pdf-encrypt-lite) — Real 128-bit RC4 PDF standard document encryption.
* [JSZip](https://stuk.github.io/jszip/) — Client-side ZIP archive generation.
* [PDF.js](https://mozilla.github.io/pdf.js/) — Canvas rasterization, thumbnail generation, and text stream extraction.
* [Tailwind CSS](https://tailwindcss.com/) — Utility-first responsive design system.
* [Lucide Icons](https://lucide.dev/) — Crisp, accessible interface iconography.
* [Canvas Confetti](https://github.com/catdad/canvas-confetti) — Celebratory micro-interactions.

---

## 📄 License

This project is licensed under the **MIT License** — you are free to use, modify, and distribute it for personal and commercial purposes.

---

<p align="center">
  Built with ❤️ for privacy, performance, and user ownership.
</p>
