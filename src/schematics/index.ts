import { Rule, SchematicContext, Tree } from '@angular-devkit/schematics';


// You don't have to export the function as default. You can also have more than one rule factory
// per file.
export function schematics(_options: any): Rule {
  console.log('schematics rule')
  return (tree: Tree, _context: SchematicContext) => {
    return tree;
  };
}
