import { Rule, SchematicContext, Tree, apply, url, applyTemplates, move, mergeWith, chain } from '@angular-devkit/schematics';
import { strings } from '@angular-devkit/core';
import { GeneratorSchema } from './schema';
import { dasherize, classify } from '@angular-devkit/core/src/utils/strings';
import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';

function getInterfaceAttributes(interfaceString: string, basePath: string = 'src/app/models'): { name: string, type: string }[] {
  const importRegex = /import\s*{\s*(\w+)\s*}\s*from\s*<.+?|'">['"]/g;
  const attributeRegex = /(\w+)\s*:\s*([^;]+)/g;
  const attributes: { name: string, type: string }[] = [];
  let match;
  let resolvedPath;

  // Resolver imports
  const imports: { [key: string]: string } = {};
  while ((match = importRegex.exec(interfaceString)) !== null) {
    const importedName = match[1].trim();
    const importPath = match[2].trim();
    resolvedPath = path.resolve(basePath, importPath + '.ts');
    if (fs.existsSync(resolvedPath)) {
      const importedInterfaceString = fs.readFileSync(resolvedPath, 'utf-8');
      imports[importedName] = importedInterfaceString;
    }
  }

  // Extraer atributos
  while ((match = attributeRegex.exec(interfaceString)) !== null) {
    const name = match[1].trim();
    let type = match[2].trim();

    // Resolver tipos importados
    if (imports[type] && resolvedPath) {
      const importedAttributes = getInterfaceAttributes(imports[type], path.dirname(resolvedPath));
      type = JSON.stringify(importedAttributes);
    }

    attributes.push({ name, type });
  }

  return attributes;
}

function getInterfaceTypes(tree: Tree, options: GeneratorSchema) {
  const interfacePath = `src/app/models/${options.singular}.ts`; // Construct interface path

  const interfaceSource = tree.read(interfacePath); // Read interface file
  if (!interfaceSource) {
    throw new Error(`Interface file '${options.singular}.ts' not found!`);
  }

  const interfaceContent = interfaceSource.toString(); // Convert content to string
  const interfaceAst = ts.createSourceFile(
    interfacePath,
    interfaceContent,
    ts.ScriptTarget.Latest
  ); // Create TypeScript SourceFile

  // Extract interface properties (logic can be optimized as needed)
  let properties: { name: string; type: string; }[] = [];
  for (const child of interfaceAst.getChildren()) {
    console.log('Child:', child.getText());
    if (child.getText()) {
      properties = getInterfaceAttributes(child.getText());
      console.log('Properties:', properties);
    }
    break;
  }
  return properties;
}

function addRoutesToRoutingModule(tree: Tree, options: GeneratorSchema) {
  // const routingModulePath = 'src/app/app-routing.module.ts';
  // const routingModuleSource = tree.read(routingModulePath);
  // if (!routingModuleSource) {
  //   throw new Error(`Routing module file 'app-routing.module.ts' not found!`);
  // }

  // const routingModuleContent = routingModuleSource.toString();
  // const routingModuleAst = ts.createSourceFile(
  //   routingModulePath,
  //   routingModuleContent,
  //   ts.ScriptTarget.Latest
  // );

  // const routes = routingModuleAst.statements.find(
  //   (node) => ts.isVariableDeclaration(node) && node.name.getText() === 'routes'
  // ) as ts.VariableDeclaration;

  // if (!routes) {
  //   throw new Error(`Routes array not found in 'app-routing.module.ts'!`);
  // }

  // // Add routes
  // const routesArray = routes.initializer as ts.ArrayLiteralExpression;
  // const route = ts.createObjectLiteral([
  //   ts.createPropertyAssignment('path', ts.createLiteral(`/${dasherize(options.plural)}`)),
  //   ts.createPropertyAssignment('component', ts.createIdentifier(`${options.plural}ListComponent`))
  // ]);
  // routesArray.elements = [...routesArray.elements, route];

  // // Save changes
  // tree.overwrite(routingModulePath, routingModuleAst.getText());

  // get the rounting module file
  const routingModulePath = 'src/app/app.routes.ts';
  const routingModuleSource = tree.read(routingModulePath);
  if (!routingModuleSource) {
    throw new Error(`Routing module file 'app.routes.ts' not found!`);
  }
  const routingModuleContent = routingModuleSource.toString();

  // prepare the new routes
  const newRoutes = `    {
        path: '${dasherize(options.plural)}',
        children: [
            { path: '', component: ${classify(options.plural)}ListComponent },
            { path: 'update', component: Update${classify(options.singular)}Component }
        ],
        canActivate: [signedInGuard]
    }`;

  // prepare imports for the new routes
  const componentImports = `import { ${classify(options.plural)}ListComponent } from './components/${dasherize(options.plural)}/${dasherize(options.plural)}-list/${dasherize(options.plural)}-list.component';
import { Update${classify(options.singular)}Component } from './components/${dasherize(options.plural)}/update-${dasherize(options.singular)}/update-${dasherize(options.singular)}.component';`;

  // find where to add the new routes and add them and the imports
  const modifiedRoutingModuleContent = routingModuleContent.replace(/(import {[^}]+} from '.+?';)/, `$1\n${componentImports}`)
    .replace(/(export const routes: Routes = \[)/, `$1\n${newRoutes},`);

  // save the changes
  tree.overwrite(routingModulePath, modifiedRoutingModuleContent);
}

function addNavigationToNavComponent(tree: Tree, options: GeneratorSchema) {
  // find the nav component file
  const navComponentPath = 'src/app/components/common/navbar/navbar.component.html';
  const navComponentSource = tree.read(navComponentPath);
  if (!navComponentSource) {
    throw new Error(`Navigation component file 'navbar.component.ts' not found!`);
  }
  const navComponentContent = navComponentSource.toString();
  // prepare the new navigation item
  const newNavigationItem = `<button (click)="router.navigate(['${dasherize(options.plural)}'])">${classify(options.plural)}</button>`;
  // find where to add the new navigation item and add it
  const modifiedNavComponentContent = navComponentContent.replace(/(<\/button>)/, `$1\n${newNavigationItem}`);
  // save the changes
  tree.overwrite(navComponentPath, modifiedNavComponentContent);
}

export function generator(options: GeneratorSchema): Rule {
  options.plural = options.plural || 'utilities'; // Set default plural para las pruebas de desarrollo
  options.singular = options.singular || 'utility'; // Set default singular para las pruebas de desarrollo
  return (tree: Tree, _context: SchematicContext) => {
    const properties = getInterfaceTypes(tree, options);

    console.log('Properties:', properties);

    const componentListSource = apply(url('./files/components/list'), [
      applyTemplates({
        ...options,
        ...strings,
        properties
      }),
      move(`src/app/components/${dasherize(options.plural)}/${dasherize(options.plural)}-list`),
    ]);

    const componentUpdateSource = apply(url('./files/components/update'), [
      applyTemplates({
        ...options,
        ...strings,
        properties
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

    if (false) { // for testing and development purposes
      addRoutesToRoutingModule(tree, options);
      addNavigationToNavComponent(tree, options);
    }
    // return tree; // for testing and development purposes
    return chain([ // for testing and development purposes
      mergeWith(componentListSource),
      mergeWith(componentUpdateSource),
      mergeWith(storeSource),
      mergeWith(serviceSource)
    ])(tree, _context);
    return chain([
      mergeWith(componentListSource),
      mergeWith(componentUpdateSource),
      mergeWith(storeSource),
      mergeWith(serviceSource)
    ])(tree, _context);

  };
}