import type { CalendarOverride } from './types'

function toMMDD(date: Date): string {
    const m = (date.getMonth() + 1).toString().padStart(2, '0')
    const d = date.getDate().toString().padStart(2, '0')
    return `${m}-${d}`
}

function toYYYYMMDD(date: Date): string {
    const y = date.getFullYear()
    const m = (date.getMonth() + 1).toString().padStart(2, '0')
    const d = date.getDate().toString().padStart(2, '0')
    return `${y}-${m}-${d}`
}

function matchesOverride(date: Date, override: CalendarOverride): boolean {
    const mmdd = toMMDD(date)
    const yyyymmdd = toYYYYMMDD(date)

    if (override.type === 'specific') {
        return override.date === yyyymmdd
    }
    if (override.type === 'annual') {
        return override.date === mmdd
    }
    // range — handles wrap-around (e.g. "12-26" to "01-06")
    const { startDate, endDate } = override
    if (startDate <= endDate) {
        return mmdd >= startDate && mmdd <= endDate
    }
    // wrap-around case
    return mmdd >= startDate || mmdd <= endDate
}

const TYPE_PRIORITY: Record<CalendarOverride['type'], number> = {
    specific: 2,
    range: 1,
    annual: 0,
}

export function resolveCalendarOverride(
    date: Date,
    overrides: CalendarOverride[],
): CalendarOverride | null {
    const matches = overrides.filter(o => matchesOverride(date, o))
    if (matches.length === 0) return null

    // Sort: higher type priority first, then higher user priority, then original order (stable)
    matches.sort((a, b) => {
        const typeDiff = TYPE_PRIORITY[b.type] - TYPE_PRIORITY[a.type]
        if (typeDiff !== 0) return typeDiff
        return b.priority - a.priority
    })

    return matches[0]
}
