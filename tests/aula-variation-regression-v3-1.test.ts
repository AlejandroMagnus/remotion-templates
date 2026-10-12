import { describe, expect, it } from 'vitest';
import { buildAulaSilecAudiovisualPlan } from '../src/content/AulaSilecNarrativeDirector';
import type { SilecKnowledgeInput } from '../src/content/SilecContentAdapter';

const base: SilecKnowledgeInput = {
  productionCode: 'video-001',
  topic: 'Prueba documental',
  hook: '¿Qué demuestra realmente la copia presentada?',
  problem: 'La contraparte presenta una copia del contrato firmado entre dos sociedades.',
  centralThesis: 'La respuesta depende de identificar el hecho discutido que pretende acreditarse.',
  reasoningChain: [
    'Debe distinguirse la autenticidad del documento de la veracidad de lo afirmado por una parte.',
    'La discrepancia de fechas exige examinar qué consecuencia concreta se pretende atribuirle.',
  ],
  conclusion: 'Toda valoración debe relacionar el documento con el hecho controvertido.',
  closingIdea: 'Una contradicción solo resulta útil cuando se explica su importancia jurídica.',
  cta: 'Consulte la documentación y las circunstancias de su caso con un profesional.',
  targetAudience: ['abogados'],
  capabilityDemonstrated: ['probatoria'],
  commercialObjective: 'educación',
  offerPath: ['consulta'],
};

describe('Aula: regresión de diversidad sin muletillas', () => {
  it('produce al menos tres aperturas realmente diferentes en una serie de videos', () => {
    const plans = Array.from({ length: 16 }, (_, n) =>
      buildAulaSilecAudiovisualPlan({ ...base, productionCode: `video-${String(n + 1).padStart(3, '0')}` }, 'case-tension-resolution'));
    expect(new Set(plans.map((p) => p.variation)).size).toBeGreaterThanOrEqual(3);
    expect(new Set(plans.map((p) => p.narration.slice(0, 48))).size).toBeGreaterThanOrEqual(3);
  });

  it('mantiene los hechos fuente, la cadena probatoria y el cierre sin puentes genéricos', () => {
    const plan = buildAulaSilecAudiovisualPlan(base, 'case-tension-resolution');
    for (const text of [base.hook, base.problem, base.centralThesis, ...base.reasoningChain, base.conclusion, base.closingIdea, base.cta]) {
      expect(plan.narration).toContain(text);
    }
    expect(plan.narration).not.toMatch(/Ahora llévelo a una situación real|El punto jurídico decisivo es este/);
    expect(plan.audit.addsNewLegalClaims).toBe(false);
  });
});
