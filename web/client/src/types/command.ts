export interface CommandResponse<T> {
    accepted: boolean;
    response: T;
}
