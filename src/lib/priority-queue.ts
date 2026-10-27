/**
 * Binary min-heap priority queue. Used by the in-process job runner to order
 * claimed jobs (lower priority number = more urgent, ties broken by enqueue order)
 * and by recommendations to keep the top-N results without sorting everything.
 */
export class PriorityQueue<T> {
  private heap: { item: T; priority: number; seq: number }[] = [];
  private seq = 0;

  get size() {
    return this.heap.length;
  }

  push(item: T, priority: number) {
    this.heap.push({ item, priority, seq: this.seq++ });
    this.up(this.heap.length - 1);
  }

  peek(): T | undefined {
    return this.heap[0]?.item;
  }

  pop(): T | undefined {
    const top = this.heap[0];
    const last = this.heap.pop();
    if (this.heap.length && last) {
      this.heap[0] = last;
      this.down(0);
    }
    return top?.item;
  }

  drain(): T[] {
    const out: T[] = [];
    while (this.size) out.push(this.pop()!);
    return out;
  }

  private less(a: number, b: number) {
    const x = this.heap[a];
    const y = this.heap[b];
    return x.priority < y.priority || (x.priority === y.priority && x.seq < y.seq);
  }

  private up(i: number) {
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (!this.less(i, p)) break;
      [this.heap[i], this.heap[p]] = [this.heap[p], this.heap[i]];
      i = p;
    }
  }

  private down(i: number) {
    const n = this.heap.length;
    for (;;) {
      const l = 2 * i + 1;
      const r = l + 1;
      let m = i;
      if (l < n && this.less(l, m)) m = l;
      if (r < n && this.less(r, m)) m = r;
      if (m === i) break;
      [this.heap[i], this.heap[m]] = [this.heap[m], this.heap[i]];
      i = m;
    }
  }
}

/** Keeps the `n` highest-scoring items in O(total · log n). */
export function topN<T>(items: Iterable<T>, n: number, score: (t: T) => number): T[] {
  const pq = new PriorityQueue<T>();
  for (const it of items) {
    pq.push(it, score(it));
    if (pq.size > n) pq.pop();
  }
  return pq.drain().reverse();
}
