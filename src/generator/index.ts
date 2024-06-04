import { Rule, SchematicContext, Tree, apply, url, applyTemplates, move, mergeWith, chain } from '@angular-devkit/schematics';
import { strings } from '@angular-devkit/core';
import { GeneratorSchema } from './schema';
import { dasherize } from '@angular-devkit/core/src/utils/strings';

export function generator(options: GeneratorSchema): Rule {
  return (tree: Tree, _context: SchematicContext) => {
    const componentListSource = apply(url('./files/components/list'), [
      applyTemplates({
        ...options,
        ...strings
      }),
      move(`src/app/components/${dasherize(options.plural)}/${dasherize(options.plural)}-list`),
    ]);

    const componentUpdateSource = apply(url('./files/components/update'), [
      applyTemplates({
        ...options,
        ...strings
      }),
      move(`src/app/components/${dasherize(options.plural)}/update-${dasherize(options.singular)}`),
    ]);

    const storeSource = apply(url('./files/store'), [
      applyTemplates({
        ...options,
        ...strings
      }),
      move('src/app/store'),
    ]);

    const serviceSource = apply(url('./files/service'), [
      applyTemplates({
        ...options,
        ...strings
      }),
      move('src/app/services')
    ]);

    return chain([
      mergeWith(componentListSource),
      mergeWith(componentUpdateSource),
      mergeWith(storeSource),
      mergeWith(serviceSource)
    ])(tree, _context);

  };
}