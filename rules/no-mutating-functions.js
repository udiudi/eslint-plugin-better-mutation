'use strict';

const _ = require('lodash/fp');
const {
  isObjectExpression,
  isFunctionExpression,
  isScopedVariable} = require('./utils/common');

const mutatingFunctions = [
  'Object.assign',
  '_.assign',
  '_.assignIn',
  '_.assignInWith',
  '_.assignWith',
  '_.defaults',
  '_.defaultsDeep',
  '_.fill',
  '_.pull',
  '_.pullAll',
  '_.pullAllBy',
  '_.pullAllWith',
  '_.pullAt',
  '_.merge',
  '_.mergeWith',
  '_.remove',
  '_.reverse',
  '_.set',
  '_.setWith',
  '_.unset',
  '_.update',
  '_.updateWith'
];

const isLodashFn = _.startsWith('_.');

function buildIsMutatingFunction(ignoredMethods, useLodashFunctionImports) {
  const matchesSpecs = _.flow(
    _.map(fn => useLodashFunctionImports && isLodashFn(fn) ? fn.slice(2) : fn),
    _.reject(fn => _.includes(fn, ignoredMethods)),
    _.map(fn => {
      const [objectName, propertyName] = _.split('.', fn);
      return propertyName ? ({
        type: 'MemberExpression',
        object: {
          type: 'Identifier',
          name: objectName
        },
        property: {
          type: 'Identifier',
          name: propertyName
        }
      }) : ({
        type: 'Identifier',
        name: objectName
      });
    })
  )(mutatingFunctions);

  return _.overSome(_.map(spec => _.matches(spec), matchesSpecs));
}

function isAllowedFirstArgument(arg, node) {
  return isObjectExpression(arg) || isFunctionExpression(arg) || isScopedVariable(arg, node.parent);
}

const create = function (context) {
  const ignoredMethods = _.getOr([], ['options', 0, 'ignoreMethods'], context);
  const useLodashFunctionImports = _.getOr(false, ['options', 0, 'useLodashFunctionImports'], context);
  const isMutatingFunction = buildIsMutatingFunction(ignoredMethods, useLodashFunctionImports);

  return {
    CallExpression(node) {
      if (isMutatingFunction(node.callee) && !isAllowedFirstArgument(node.arguments[0], node)) {
        context.report({
          node,
          message: 'Unallowed use of mutating functions'
        });
      }
    }
  };
};

module.exports = {
  create,
  meta: {
    schema: [{
      type: 'object',
      properties: {
        ignoredMethods: {
          type: 'array',
          items: {
            type: 'string'
          }
        },
        useLodashFunctionImports: {
          type: 'boolean'
        }
      }
    }],
    docs: {
      description: 'Forbid the use of [`Object.assign()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/assign) with a variable as first argument.',
      recommended: 'error'
    }
  }
};
