import type { Competition, Contestant, Round } from '../domain';

export function createAITemplateCombo(): { competition: Competition; contestants: Contestant[]; rounds: Round[] } {
    const compId = crypto.randomUUID();
    const now = Date.now();

    const competition: Competition = {
        id: compId,
        title: 'AI Image Models Battle',
        scoring: { min: 0, max: 10, integerOnly: true },
        createdAt: now,
        updatedAt: now,
        ui: { theme: 'neoArcade', density: 'comfortable' },
    };

    const cNames = ['ChatGPT', 'Gemini', 'Flux', 'Grok', 'Dreamina'];
    const contestants: Contestant[] = cNames.map((name, idx) => ({
        id: crypto.randomUUID(),
        competitionId: compId,
        name,
        createdAt: now + idx,
    }));

    const prompts = [
        'A minimalist 2D logo for a coffee shop featuring a geometric owl',
        'A cinematic shot of a dragon breathing fire inside a crumbling cathedral',
        'A product photo of a smartwatch on a reflective surface with neon lighting',
        'A cozy isometric room illustration, warm lighting, lots of plants',
        'A sci-fi character portrait, cyberpunk, shallow depth of field'
    ];

    const rounds: Round[] = prompts.map((title, orderIndex) => ({
        id: crypto.randomUUID(),
        competitionId: compId,
        title,
        orderIndex,
        createdAt: now + orderIndex,
    }));

    return { competition, contestants, rounds };
}
