// Texto de la autorización de protección de datos que firma el alumno (o su tutor) al darse de alta.
// Plantilla basada en el RGPD (UE) 2016/679 y la LOPDGDD 3/2018: conviene que la revise
// el asesor del gimnasio y rellenar en Ajustes el titular y el contacto reales.
import { getState } from './store.js';

export const CONSENT_VERSION = 1;

export const RELATIONS = { madre: 'Madre', padre: 'Padre', tutor: 'Tutor legal' };
const RELATION_TEXT = { madre: 'madre', padre: 'padre', tutor: 'tutor legal' };

// signer: 'alumno' | 'tutor'; relation: 'madre' | 'padre' | 'tutor'
export function consentText({ studentName = '', signer = 'alumno', signerName = '', relation = 'tutor' } = {}) {
  const s = getState();
  const holder = s.privacy?.holder?.trim() || s.gymName;
  const contact = s.privacy?.contact?.trim() || 'en la recepción del gimnasio';
  const who = signer === 'tutor'
    ? `Yo, ${signerName.trim() || '[nombre del padre, madre o tutor]'}, como ${RELATION_TEXT[relation] || 'tutor legal'} de ${studentName.trim() || '[alumno]'}, menor de edad, autorizo`
    : `Yo, ${studentName.trim() || '[nombre del alumno]'}, autorizo`;
  const whose = signer === 'tutor' ? 'sus datos personales' : 'mis datos personales';
  return [
    signer === 'tutor'
      ? `${who} a ${holder}, como responsable del tratamiento, a guardar y tratar ${whose} (nombre, apellidos, teléfono y fotografía) y mis datos de contacto como su ${RELATION_TEXT[relation] || 'tutor legal'} (nombre y teléfono).`
      : `${who} a ${holder}, como responsable del tratamiento, a guardar y tratar ${whose} (nombre, apellidos, teléfono y fotografía).`,
    'Finalidad: gestionar la inscripción, la asistencia a las clases y el cobro de las cuotas. La fotografía solo se usa para identificar al alumno dentro de la aplicación del gimnasio; no se publica ni se usa con fines promocionales.',
    'Base jurídica: el consentimiento que se da con esta firma (art. 6.1.a RGPD) y la relación como alumno del gimnasio (art. 6.1.b RGPD).',
    'Los datos no se cederán a terceros salvo obligación legal. Se conservarán mientras se mantenga la relación con el gimnasio y, después, solo durante los plazos que exija la ley.',
    `Se puede retirar este consentimiento en cualquier momento y ejercer los derechos de acceso, rectificación, supresión, oposición, limitación y portabilidad dirigiéndose a ${holder} (${contact}). También se puede presentar una reclamación ante la Agencia Española de Protección de Datos (www.aepd.es).`,
  ];
}
