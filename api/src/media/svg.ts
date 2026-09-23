import { BadRequestException } from '@nestjs/common';
import { DOMParser, XMLSerializer, onErrorStopParsing } from '@xmldom/xmldom';

// Logos are static images. Keep vector geometry, local definitions and typography;
// never retain scripting, HTML, external resources, DTDs or animation.
const tags = new Set('svg g path rect circle ellipse line polyline polygon defs linearGradient radialGradient stop clipPath mask use symbol title desc text tspan'.split(' '));
const attributes = new Set('id viewBox width height x y x1 y1 x2 y2 cx cy r rx ry d points transform fill fill-rule fill-opacity stroke stroke-width stroke-linecap stroke-linejoin stroke-miterlimit stroke-dasharray stroke-dashoffset stroke-opacity opacity clip-path clip-rule mask maskUnits maskContentUnits clipPathUnits gradientUnits gradientTransform spreadMethod offset stop-color stop-opacity font-family font-size font-weight text-anchor dominant-baseline preserveAspectRatio'.split(' '));
const styleProperties = new Set('fill fill-rule fill-opacity stroke stroke-width stroke-linecap stroke-linejoin stroke-miterlimit stroke-dasharray stroke-dashoffset stroke-opacity opacity stop-color stop-opacity'.split(' '));
function safeValue(value: string) {
  return !/[\\<>]|@|expression|javascript|data:|https?:/i.test(value) &&
    (!/url\s*\(/i.test(value) || /^url\(\s*#[\w.-]+\s*\)$/.test(value));
}
export function sanitizeSvg(buffer: Buffer): Buffer {
  if (buffer.length > 2 * 1024 * 1024) throw new BadRequestException('SVG-логотип должен быть не больше 2 МБ');
  const input = buffer.toString('utf8');
  if (/<!DOCTYPE|<!ENTITY/i.test(input)) throw new BadRequestException('SVG с DTD не поддерживается');
  try {
    const document = new DOMParser({onError:onErrorStopParsing}).parseFromString(input,'image/svg+xml');
    const root = document.documentElement;
    if (!root || root.nodeName !== 'svg' || root.namespaceURI !== 'http://www.w3.org/2000/svg') throw new Error('Invalid SVG');
    const visit = (element: typeof root) => {
      if (!tags.has(element.nodeName) || element.namespaceURI !== root.namespaceURI) throw new Error('Unsupported SVG element');
      for (const attribute of Array.from(element.attributes)) {
        const name=attribute.name, value=attribute.value;
        if (name==='xmlns' && element===root) continue;
        if ((name==='href'||name==='xlink:href')&&/^#[\w.-]+$/.test(value)) continue;
        if(name==='xmlns:xlink'&&value==='http://www.w3.org/1999/xlink')continue;
        if(name==='style') {
          const declarations=value.split(';').map(part=>part.split(':')).filter(parts=>parts.length===2&&styleProperties.has(parts[0].trim())&&safeValue(parts[1].trim()));
          element.removeAttribute(name);
          for(const [property,content] of declarations)element.setAttribute(property.trim(),content.trim());
          continue;
        }
        if(!attributes.has(name)||!safeValue(value))element.removeAttributeNode(attribute);
      }
      for(const child of Array.from(element.childNodes)) {
        if(child.nodeType===1)visit(child as typeof root);
        else if(child.nodeType!==3)element.removeChild(child);
      }
    };
    visit(root);
    return Buffer.from(new XMLSerializer().serializeToString(root));
  } catch {
    throw new BadRequestException('Не удалось прочитать статичный SVG. Экспортируйте логотип в кривых без эффектов и внешних ресурсов или загрузите PNG.');
  }
}
