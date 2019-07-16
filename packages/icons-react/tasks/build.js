/**
 * Copyright IBM Corp. 2019, 2019
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

/* eslint-disable no-console */

'use strict';

const meta = require('@rocketsoftware/icons/build-info.json');
const fs = require('fs-extra');
const path = require('path');
const { rollup } = require('rollup');
const babel = require('rollup-plugin-babel');
const virtual = require('./plugins/virtual');

const PACKAGE_DIR = path.resolve(__dirname, '../');
const BUNDLE_FORMATS = [
  {
    file: path.join(PACKAGE_DIR, 'es/index.js'),
    format: 'esm',
  },
  {
    file: path.join(PACKAGE_DIR, 'lib/index.js'),
    format: 'cjs',
  },
  {
    file: path.join(PACKAGE_DIR, 'umd/index.js'),
    format: 'umd',
  },
];

/**
 * Take the processed `meta.json` file from `@rocketsoftware/icons` and generate an
 * entrypoint for `@rocketsoftware/icons-react`. This entrypoint is generated by
 * building icon components built on top of the `<Icon>` primitive in `src`.
 */
async function build() {
  const modules = meta.map(icon =>
    createIconComponent(icon.moduleName, icon.descriptor)
  );

  const entrypoint = `/**
 * Copyright IBM Corp. 2019, 2019
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import Icon from './Icon.js';

${modules.map(({ source }) => `export ${source}`).join('\n')}

export { Icon };
`;

  const bundle = await rollup({
    input: '__entrypoint__.js',
    external: ['@rocketsoftware/icon-helpers', 'react', 'prop-types'],
    plugins: [
      virtual({
        '__entrypoint__.js': entrypoint,
        './Icon.js': fs.readFileSync(
          path.resolve(__dirname, '../src/Icon.js'),
          'utf8'
        ),
      }),
      babel({
        babelrc: false,
        exclude: /node_modules/,
        presets: [
          [
            '@babel/preset-env',
            {
              targets: {
                browsers: ['extends browserslist-config-carbon'],
              },
            },
          ],
          '@babel/preset-react',
        ],
      }),
    ],
  });

  await Promise.all(
    BUNDLE_FORMATS.map(({ format, file }) => {
      const outputOptions = {
        format,
        file,
      };

      if (format === 'umd') {
        outputOptions.name = 'CarbonIconsReact';
        outputOptions.globals = {
          '@rocketsoftware/icon-helpers': 'CarbonIconHelpers',
          'prop-types': 'PropTypes',
          react: 'React',
        };
      }

      return bundle.write(outputOptions);
    })
  );

  // Create aliases for `@carbon/icons-react/<bundle-type>/<icon-name>/<size>`
  await Promise.all(
    meta.map(async info => {
      const { moduleName, outputOptions } = info;
      const pathToEntrypoint = Array.from({
        // The length of this is determined by the number of directories from
        // our `outputOptions` minus 1 for the bundle type (`es` for example)
        // and minus 1 for the filename as it does not count as a directory jump
        length: outputOptions.file.split('/').length - 2,
      })
        .fill('..')
        .join('/');

      await fs.ensureFile(outputOptions.file);
      await fs.writeFile(
        outputOptions.file,
        `import { ${moduleName} } from '${pathToEntrypoint}';
export default ${moduleName};
`
      );

      const commonjsFilepath = outputOptions.file.replace(/es\//, 'lib/');
      await fs.ensureFile(commonjsFilepath);
      await fs.writeFile(
        commonjsFilepath,
        `const { ${moduleName} = require('${pathToEntrypoint}');
module.exports = ${moduleName};
`
      );
    })
  );
}

/**
 * Generate an icon component, which in our case is the string representation
 * of the component, from a given moduleName and icon descriptor.
 * @param {string} moduleName
 * @param {object} descriptor
 * @returns {string}
 */
function createIconComponent(moduleName, descriptor) {
  const { attrs, content } = descriptor;
  const { width, height, viewBox } = attrs;
  const source = `const ${moduleName} = /*#__PURE__*/ React.forwardRef(
  function ${moduleName}(props, ref) {
    return (
      <Icon width={${width}} height={${height}} viewBox="${viewBox}" ref={ref} {...props}>
        ${content.map(convertToJSX).join('\n')}
        {props.children}
      </Icon>
    );
  }
);
`;

  return {
    source,
  };
}

/**
 * Convert the given node to a JSX string source
 * @param {object} node
 * @returns {string}
 */
function convertToJSX(node) {
  const { elem, attrs } = node;
  return `<${elem} ${formatAttributes(attrs)} />`;
}

/**
 * Serialize a given object of key, value pairs to an JSX-compatible string
 * @param {object} attrs
 * @returns {string}
 */
function formatAttributes(attrs) {
  return Object.keys(attrs).reduce((acc, key, index) => {
    const attribute = `${key}="${attrs[key]}"`;
    if (index === 0) {
      return attribute;
    }
    return acc + ' ' + attribute;
  }, '');
}

build().catch(error => {
  console.error(error);
});
