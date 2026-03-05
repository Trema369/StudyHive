export type ThinkMessage = {
    content: string
    thinking: string | null
}

export function splitThink(rawText?: string): ThinkMessage {
    const text = rawText ?? ''
    if (!(text.includes('<think>') && text.includes('</think>'))) {
        return {
            content: text,
            thinking: null,
        }
    }

    const splitStart = text.split('<think>')
    const prefix = splitStart[0] ?? ''
    const splitEnd = (splitStart[1] ?? '').split('</think>')
    const thinking = (splitEnd[0] ?? '').trim()
    const suffix = splitEnd[1] ?? ''
    const content = `${prefix}${suffix}`.trim()

    return {
        content,
        thinking: thinking.length > 0 ? thinking : null,
    }
}
