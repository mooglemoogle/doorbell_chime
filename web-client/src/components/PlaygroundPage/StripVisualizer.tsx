import { FC, useEffect, useRef } from 'react'
import { Pixel } from '@app/algorithmRuntime/pixel'

interface Props {
    pixels: Pixel[]
}

const HEIGHT = 80
const PADDING = 4

export const StripVisualizer: FC<Props> = ({ pixels }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const count = pixels.length
        if (count === 0) return

        const dpr = window.devicePixelRatio || 1
        const cssWidth = canvas.getBoundingClientRect().width
        const cssHeight = HEIGHT

        canvas.width = cssWidth * dpr
        canvas.height = cssHeight * dpr
        ctx.scale(dpr, dpr)

        ctx.clearRect(0, 0, cssWidth, cssHeight)
        ctx.fillStyle = '#111'
        ctx.fillRect(0, 0, cssWidth, cssHeight)

        const totalPadding = PADDING * (count + 1)
        const diameter = Math.min((cssWidth - totalPadding) / count, cssHeight - PADDING * 2)
        const radius = diameter / 2
        const startY = cssHeight / 2

        for (let i = 0; i < count; i++) {
            const [r, g, b] = pixels[i].getRgb(1.0)
            const color = `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`
            const x = PADDING + radius + i * (diameter + PADDING) + radius

            ctx.beginPath()
            ctx.arc(x, startY, radius, 0, Math.PI * 2)
            ctx.fillStyle = color
            ctx.shadowColor = color
            ctx.shadowBlur = radius * 1.5
            ctx.fill()
            ctx.shadowBlur = 0
        }
    }, [pixels])

    return (
        <canvas
            ref={canvasRef}
            style={{ width: '100%', height: `${HEIGHT}px`, display: 'block', borderRadius: '4px' }}
        />
    )
}
