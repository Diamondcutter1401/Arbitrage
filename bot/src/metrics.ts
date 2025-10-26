export interface Metric {
  name: string;
  value: number;
  labels?: Record<string, string>;
  timestamp?: Date;
}

export class MetricsLogger {
  private metrics: Metric[] = [];

  record(metric: Metric): void {
    metric.timestamp = metric.timestamp || new Date();
    this.metrics.push(metric);
  }

  recordCounter(name: string, value: number, labels?: Record<string, string>): void {
    this.record({ name, value, labels });
  }

  recordGauge(name: string, value: number, labels?: Record<string, string>): void {
    this.record({ name, value, labels });
  }

  recordHistogram(name: string, value: number, labels?: Record<string, string>): void {
    this.record({ name, value, labels });
  }

  getMetrics(): Metric[] {
    return [...this.metrics];
  }

  clear(): void {
    this.metrics = [];
  }

  // Simple Prometheus-style format
  formatPrometheus(): string {
    const lines: string[] = [];
    
    for (const metric of this.metrics) {
      let line = metric.name;
      
      if (metric.labels) {
        const labelPairs = Object.entries(metric.labels)
          .map(([key, value]) => `${key}="${value}"`)
          .join(",");
        line += `{${labelPairs}}`;
      }
      
      line += ` ${metric.value}`;
      
      if (metric.timestamp) {
        line += ` ${metric.timestamp.getTime()}`;
      }
      
      lines.push(line);
    }
    
    return lines.join("\n");
  }
}
