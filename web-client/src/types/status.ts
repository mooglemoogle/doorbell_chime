export interface Status {
    brightness: number;
    running: boolean;
    current_cycle: string;
    transition_time: number;
    current_algorithm?: string | null;
    current_algorithm_display_name?: string | null;
    current_algorithm_options?: Record<string, unknown> | null;
    last_change_time?: number;
    next_change_time?: number | null;
    is_in_transition?: boolean;
}
