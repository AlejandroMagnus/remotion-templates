import { describe, expect, it } from 'vitest';
import { buildAulaSilecAudiovisualPlan } from '../src/content/AulaSilecNarrativeDirector';
import { applyAuthorialPresentation, buildAuthorialPlan } from '../src/content/AuthorialDirector';
import type { SilecKnowledgeInput } from '../src/content/SilecContentAdapter';

const source: SilecKnowledgeInput = {
  productionCode: 'video-016',
  topic: 'Prueba documental civil',
  hook: '¿Qué demuestra realmente el documento que acaba de presentar la contraparte?',
  problem: 'En el expediente se aporta una copia del contrato firmado entre dos sociedades.',
  centralThesis: 'La respuesta debe identificar qué extremo se intenta demostrar con esa copia.',
  reasoningChain: [
    'En el expediente se aporta una copia del contrato firmado entre dos sociedades.',
    'El abogado confronta la copia con el original conservado por su cliente.',
    'La fecha del contrato no coincide con la fecha que aparece en la carta posterior.',
    'La respuesta distingue autenticidad documental y veracidad de las afirmaciones contrarias.',
  ],
  conclusion: 'La respuesta debe diferenciar el documento, su procedencia y la controversia planteada.',
  closingIdea: 'Una contradicción documental solo tiene utilidad cuando se explica su efecto en el litigio.',
  cta: 'Consulte con un profesional antes de presentar documentos controvertidos.',
  targetAudience: ['abogados'], capabilityDemonstrated: ['probatoria'],
  commercialObjective: 'educación', offerPath: ['consulta'],
};

describe('Aula SILEC V3: narración fiel, específica y no repetitiva', () => {
  it.each([0,1,2,3,4,5])('mantiene source-bound en las seis concepciones (intento %i)', attempt => {
    const plan = buildAuthorialPlan(source, attempt);
    const presented = applyAuthorialPresentation(source, plan);
    const before = JSON.stringify(presented);
    const aula = buildAulaSilecAudiovisualPlan(presented, 'case-tension-resolution');
    expect(JSON.stringify(presented)).toBe(before);
    expect(aula.narration).toContain(source.hook);
    expect(aula.narration).toContain(source.conclusion);
    expect(aula.narration).toContain(source.closingIdea);
    expect(aula.narration).toContain(source.cta);
    expect(aula.narration).not.toContain('Ahora llévelo a una situación real');
    expect(aula.narration).not.toContain('El punto jurídico decisivo es este');
    expect(aula.audit.droppedRepeatedPropositions).toBeGreaterThanOrEqual(1);
    expect(aula.audit.addsNewLegalClaims).toBe(false);
  });
  it('no elimina negaciones ni modalidades jurídicas', () => {
    const exceptional = { ...source, reasoningChain: [
      'El documento puede valorarse cuando concurren los presupuestos establecidos por la norma aplicable y se garantiza contradicción.',
      'El documento no puede valorarse cuando concurren los presupuestos establecidos por la norma aplicable y se garantiza contradicción.',
    ] };
    const aula = buildAulaSilecAudiovisualPlan(exceptional, 'case-tension-resolution');
    expect(aula.narration).toContain(exceptional.reasoningChain[0]);
    expect(aula.narration).toContain(exceptional.reasoningChain[1]);
  });

});
