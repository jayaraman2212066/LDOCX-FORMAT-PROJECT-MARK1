# LDOC API Reference

## REST API

Base URL: `http://127.0.0.1:8080`

Start server: `ldoc-server` (or `target\release\ldoc-server.exe`)

---

### POST /documents

Upload a `.ldocx` document. Returns a document ID for subsequent requests.

**Request**
```
POST /documents
Content-Type: application/octet-stream
Body: <raw .ldocx file bytes>
```

**Response 201**
```json
{"id": "a1b2c3d4e5f6"}
```

**Response 400**
```json
{"error": "invalid magic bytes"}
```

---

### GET /documents/:id

Retrieve document metadata.

**Request**
```
GET /documents/a1b2c3d4e5f6
```

**Response 200**
```json
{
  "id": "a1b2c3d4e5f6",
  "title": "My Document",
  "author": "Alice",
  "page_count": 12,
  "raw_size": 48210,
  "valid": true
}
```

**Response 404**
```json
{"error": "document not found"}
```

---

### GET /documents/:id/pages

Retrieve the page list for a document.

**Request**
```
GET /documents/a1b2c3d4e5f6/pages
```

**Response 200**
```json
[
  {"id": "page_001", "title": "Welcome",      "number": 1, "visible": true},
  {"id": "page_002", "title": "Rich Content", "number": 2, "visible": true},
  {"id": "page_003", "title": "Tables",       "number": 3, "visible": true}
]
```

---

### POST /documents/:id/validate

Validate a document and return detailed results.

**Request**
```
POST /documents/a1b2c3d4e5f6/validate
```

**Response 200**
```json
{
  "valid": true,
  "checks": ["magic", "header", "zip", "manifest", "metadata", "pages", "assets", "hashes"]
}
```

---

## WebSocket API

Connect to: `ws://127.0.0.1:8080/ws`

The server pushes JSON event frames when document operations occur.

### Handshake

Standard RFC 6455 WebSocket upgrade. The server implements the handshake including SHA-1 accept key computation.

### Events

#### connected
Sent immediately on connection.
```json
{"event": "connected", "server": "ldoc-server", "version": "1.0.0"}
```

#### document_loaded
Sent when a document is uploaded via POST /documents.
```json
{"event": "document_loaded", "id": "a1b2c3d4e5f6"}
```

#### validation_completed
Sent when POST /documents/:id/validate completes.
```json
{"event": "validation_completed", "id": "a1b2c3d4e5f6", "valid": true}
```

### JavaScript Example

```javascript
const ws = new WebSocket('ws://127.0.0.1:8080/ws');

ws.onopen = () => console.log('Connected');

ws.onmessage = (e) => {
  const event = JSON.parse(e.data);
  switch (event.event) {
    case 'document_loaded':
      console.log('Document loaded:', event.id);
      break;
    case 'validation_completed':
      console.log('Validation:', event.valid ? 'PASS' : 'FAIL');
      break;
  }
};
```

---

## Error Responses

All errors return JSON:

```json
{"error": "<message>"}
```

| HTTP Status | Meaning |
|-------------|---------|
| 400 | Bad request (invalid bytes, missing fields) |
| 404 | Document not found |
| 405 | Method not allowed |
| 500 | Internal server error |

---

## Rust SDK API

See `docs/SDK.md` for the full Rust SDK reference.

Key types:
- `LdocDocument` — load and inspect documents
- `LdocSession` — interactive runtime session
- `LdocApi` — multi-document registry
- `LdocPluginManager` — plugin lifecycle
- `LdocAiRuntime` — AI provider abstraction
