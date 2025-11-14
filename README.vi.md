# DEX Arbitrage Bot — Hướng dẫn chi tiết (VI)

Tài liệu này mô tả kiến trúc dự án, các thành phần chính trong mã nguồn, cấu hình môi trường, và hướng dẫn chạy bot tìm kiếm cơ hội arbitrage trên Base và Arbitrum.

## Tổng quan

- Hỗ trợ nhiều chuỗi: Base, Arbitrum
- Nguồn dữ liệu pool: Uniswap V3 và Curve (qua Subgraph)
- Định tuyến: sinh tuyến 2–3 chặng, chấm điểm, trích giá on-chain
- Thực thi: chuẩn bị bundle giao dịch (tùy chọn private mempool)
- Lưu trữ: PostgreSQL (khởi tạo bằng các file SQL trong `sql/`)
- Vận hành: Docker Compose (dịch vụ `db`, `bot`, và tùy chọn `prometheus`)

## Cấu trúc thư mục

```
Arbitrage/
  bot/
    src/
      chains.ts          # Client & cấu hình chuỗi
      db.ts              # Kết nối & thao tác PostgreSQL
      index.ts           # Vòng lặp chính của bot
      metrics.ts         # Ghi log metrics (chưa có HTTP /metrics)
      risk.ts            # Quản lý rủi ro cơ bản
      discovery/
        univ3.ts         # Lấy danh sách pool Uniswap V3 (qua Subgraph)
        curve.ts         # Lấy danh sách pool Curve (qua Subgraph, có introspection)
      quotes/
        univ3.ts         # Gọi QuoterV2 để lấy quote cho Uniswap V3
        curve.ts         # Lấy quote cho Curve (nếu dùng)
      route/
        gen.ts           # Sinh các tuyến giao dịch từ danh sách pool
        score.ts         # Chấm điểm và lọc tuyến có lợi nhuận
      exec/
        tx.ts            # Dựng giao dịch, gửi lên RPC/private mempool
        bundle.ts        # (Tùy chọn) gom lệnh
    config/
      *.json             # Cấu hình chain/dex/tokens/chiến lược
    scripts/             # backfill, backtest, discover, deploy (dev)
  contracts/             # Hợp đồng ArbExecutor, Foundry setup
  ops/
    docker-compose.yml   # Orchestrate db/bot/prometheus
    env.example          # Mẫu biến môi trường
    .env                 # Biến môi trường thực tế (không commit)
    prometheus.yml/      # Cấu hình Prometheus mẫu
  sql/
    schema.sql           # Tạo schema PostgreSQL
    indexes.sql          # Indexes tối ưu hóa truy vấn
```

## Biến môi trường (ops/.env)

Các biến quan trọng:

- RPC
  - `BASE_RPC`, `ARB_RPC`: URL RPC có key hợp lệ (ví dụ Ankr/Alchemy). Với Ankr nên nhúng key vào URL: `https://rpc.ankr.com/base/<KEY>`.
- Subgraph
  - `BASE_UNIV3_SUBGRAPH`, `ARB_UNIV3_SUBGRAPH`: Gateway URL cho Uniswap V3.
  - `BASE_CURVE_SUBGRAPH`, `ARB_CURVE_SUBGRAPH`: Gateway URL cho Curve. Lưu ý một số subgraph không có trường `pools`.
- The Graph Gateway auth
  - `GRAPH_AUTH_MODE`: `bearer` (mặc định) hoặc `apikey`.
  - `GRAPH_API_KEY`: API key để thêm vào header (ví dụ `Authorization: Bearer <KEY>`).
  - Có thể thay thế bằng cách gắn key trực tiếp vào URL Gateway.
- Khác
  - `DATABASE_URL`: ví dụ `postgresql://arb:arb@db:5432/arb`
  - `SEARCHER_PK`: private key dùng để ký giao dịch (chỉ test; production nên bảo mật nghiêm ngặt)
  - `EXECUTOR_CONTRACT`: địa chỉ hợp đồng ArbExecutor sau khi triển khai (nếu thực thi on-chain)
  - `LOG_LEVEL`, `MAX_GAS_PRICE_GWEI`, `MAX_SLIPPAGE_BPS`, `PROFIT_FLOOR_USD`...

Gợi ý an toàn:
- Không commit file `.env` lên git.
- Sử dụng key riêng cho môi trường dev/test; xoay (rotate) key nếu đã lộ.

## Chạy bằng Docker Compose

1) Chuẩn bị `.env`

```powershell
cd D:\Workspace\HHT\Abitrage\Arbitrage\ops
copy env.example .env
# Mở .env và điền đầy đủ:
#  - BASE_RPC/ARB_RPC có API key
#  - BASE_/ARB_ *_SUBGRAPH là URL Gateway hợp lệ
#  - GRAPH_AUTH_MODE=bearer và GRAPH_API_KEY=<YOUR_GRAPH_KEY>
```

2) Khởi động dịch vụ

```powershell
docker compose up -d --build
```

3) Theo dõi log bot

```powershell
docker compose logs -f bot
```

Kết quả kỳ vọng khi cấu hình đúng:
- Thấy log dạng:
  - `[base] Pools => UniV3: N, Curve: M`
  - `[arbitrum] Pools => UniV3: N, Curve: M`
- Nếu subgraph yêu cầu auth mà thiếu key: sẽ thấy "missing authorization header".
- Nếu subgraph Curve không có `pools`: bot sẽ ghi log và bỏ qua Curve (đã có introspection trong `curve.ts`).

4) Kiểm tra nhanh trong container (tùy chọn)

```powershell
docker compose exec bot /bin/sh -c "env | grep '^GRAPH_\|^BASE_RPC\|^ARB_RPC'"
```

5) Truy vấn DB (tùy chọn)

```powershell
docker compose exec db psql -U arb -d arb -c "SELECT ts, chain, profit_usd FROM quotes ORDER BY ts DESC LIMIT 20;"
```

## Lỗi thường gặp và cách xử lý

- RPC Unauthorized: dùng RPC yêu cầu API key (Ankr/Alchemy) nhưng chưa thêm key → nhúng key vào URL.
- Graph "missing authorization header": đã dùng Gateway URL nhưng chưa đặt `GRAPH_API_KEY` hoặc sai `GRAPH_AUTH_MODE`.
- Curve: `Type Query has no field pools`: subgraph không hỗ trợ query `pools` → đổi sang subgraph đúng, hoặc tạm thời bỏ trống để bỏ qua Curve.
- `Profitable routes: 0`: do dữ liệu discovery hạn chế, cấu hình chiến lược chặt, hoặc chênh lệch giá chưa đủ sau phí/gas.

## Hợp đồng và thực thi (tùy chọn)

- Thư mục `contracts/` chứa `ArbExecutor.sol` và cấu hình Foundry.
- Có thể triển khai bằng Foundry; sau đó đặt `EXECUTOR_CONTRACT` trong `.env` để bot có thể thực thi giao dịch.

## Monitoring (tùy chọn)

- `ops/docker-compose.yml` có dịch vụ Prometheus mẫu. Bot hiện chưa phơi bày `/metrics` HTTP; nếu cần, bổ sung web-server expose `metrics.formatPrometheus()` trong `metrics.ts`.

## Ghi chú bảo mật

- Tuyệt đối không dùng private key thật trong môi trường demo.
- Dùng RPC riêng tư cho sản xuất; cân nhắc private mempool.

---

# Phụ lục: Cách hoạt động (tóm tắt)

1. Discovery: gọi Subgraph lấy danh sách pool (UniV3/Curve). Hỗ trợ AUTH header.
2. Route Gen: tạo tuyến 2–3 leg từ tokens/pools.
3. Quote: đọc giá on-chain (QuoterV2 UniV3, v.v.).
4. Score: chấm điểm, lọc tuyến có lợi nhuận sau phí/gas/slippage.
5. (Tùy chọn) Execute: dựng giao dịch và gửi RPC/private tx.
