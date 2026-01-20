
type Task<T> = () => Promise<T>;

export class RequestQueue {
    private queue: { task: Task<any>; resolve: (value: any) => void; reject: (reason: any) => void }[] = [];
    private activeCount = 0;
    private concurrency: number;

    constructor(concurrency: number = 2) {
        this.concurrency = concurrency;
    }

    add<T>(task: Task<T>): Promise<T> {
        return new Promise((resolve, reject) => {
            this.queue.push({ task, resolve, reject });
            this.processNext();
        });
    }

    private async processNext() {
        if (this.activeCount >= this.concurrency || this.queue.length === 0) {
            return;
        }

        const item = this.queue.shift();
        if (!item) return;

        this.activeCount++;

        try {
            const result = await item.task();
            item.resolve(result);
        } catch (error) {
            item.reject(error);
        } finally {
            this.activeCount--;
            this.processNext();
        }
    }

    get pendingCount() {
        return this.queue.length;
    }
}

export const globalQueue = new RequestQueue(2);
