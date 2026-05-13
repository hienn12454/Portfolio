# Grafana Observability

Dự án đã được chuẩn bị để gửi metrics, traces và logs từ backend ASP.NET Core lên Grafana Cloud bằng OpenTelemetry OTLP. GitHub Actions cũng có bước tạo annotation sau mỗi lần deploy frontend/backend, nếu bạn đã cấu hình secret Grafana.

## 1. Cấu hình Grafana Cloud cho backend

Vào Grafana Cloud, tạo OTLP endpoint trong phần OpenTelemetry/OTLP. Sau đó thêm các App Settings sau vào Azure Web App backend `PortfolioBE`:

```env
OTEL_SERVICE_NAME=portfolio-api
OTEL_EXPORTER_OTLP_ENDPOINT=<GRAFANA_CLOUD_OTLP_ENDPOINT>
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
OTEL_EXPORTER_OTLP_HEADERS=<GRAFANA_CLOUD_GENERATED_AUTH_HEADER>
OTEL_RESOURCE_ATTRIBUTES=service.namespace=hiennt-portfolio,deployment.environment=production
```

Giá trị `OTEL_EXPORTER_OTLP_HEADERS` nên lấy trực tiếp từ Grafana Cloud OpenTelemetry connection tile, thường có dạng `Authorization=Basic <base64(instance_id:token)>`.

Backend chỉ bật exporter khi có một trong các biến endpoint OTLP sau:

```env
OTEL_EXPORTER_OTLP_ENDPOINT
OTEL_EXPORTER_OTLP_TRACES_ENDPOINT
OTEL_EXPORTER_OTLP_METRICS_ENDPOINT
OTEL_EXPORTER_OTLP_LOGS_ENDPOINT
```

Vì vậy môi trường local vẫn chạy bình thường nếu chưa cấu hình Grafana.

## 2. Cấu hình GitHub Actions annotations

Thêm các repository secrets sau trong GitHub:

```env
GRAFANA_URL=https://<your-stack>.grafana.net
GRAFANA_SERVICE_ACCOUNT_TOKEN=<grafana-service-account-token>
```

Token cần quyền tạo annotation trong Grafana. Sau khi deploy thành công, workflow sẽ gọi:

```text
POST /api/annotations
```

Các annotation được gắn tag:

```text
deployment
frontend hoặc backend
github-actions
portfolio
```

## 3. Dashboard nên tạo

- API request rate theo endpoint và status code.
- API latency p50/p95/p99.
- Tỷ lệ lỗi 4xx/5xx.
- Runtime metrics của .NET: CPU, GC, memory, thread pool.
- Logs theo `portfolio-api`.
- Annotation deploy để so sánh lỗi/latency trước và sau mỗi lần release.

## 4. GitHub integration trong Grafana

Nếu muốn theo dõi repo trực tiếp trong Grafana Cloud, vào:

```text
Grafana Cloud > Connections > Add new connection > GitHub
```

Kết nối GitHub repository của dự án để lấy dashboard về pull requests, issues, commits và API rate limit.
