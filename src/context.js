'use strict'

var path = require('path')


function stringify(args) {
    return JSON.stringify(Array.prototype.slice.call(args))
}


function sanityFac(production) {
    return function sanity(arg, kludge) {
        if(typeof arg !== 'string')
            throw new Error('SANITY expects a string, got type ' + (typeof arg))

        if(production) {
            if(kludge)
                return 'if(!( ' + arg + ' )) { ' + kludge + ' }'
            else
                return ''
        }
        else {
            return 'if(!( ' + arg + ' )) { throw new Error("Sanity check failed: << '
                   + arg.replace(/"/g, '\\"') + ' >>") }'
        }
    }
}

function sanityFailFac(production) {
    var sanity = sanityFac(production)
    return function sanityFail(kludge) {
        return sanity('false', kludge)
    }
}

function noAccessFac(production) {
    return function noAccess(object /*, varargs*/) {
        if(arguments.length < 2)
            throw new Error('DEFINE_NO_ACCESS expects 2 or more arguments, got '
                            + stringify(arguments))

        if(production)
            return ''

        var result = []
        for(var i = 1; i < arguments.length; i += 1) {
            if(typeof arguments[i] !== 'string')
                throw new Error('DEFINE_NO_ACCESS expects string arguments')
            
            result.push('Object.defineProperty(' + object + ', "' + arguments[i] + '", ')
            result.push('{configurable: false, enumerable: false, ')
            result.push('get: function() {')
                result.push('throw new Error("Accessed illegal property \\"')
                result.push(arguments[i] + '\\"")')
            result.push('},')
            result.push('set: function() {')
                result.push('throw new Error("Assigned to illegal property \\"')
                result.push(arguments[i] + '\\"")')
            result.push('}')
            result.push('});')
        }

        return result.join('')
    }
}

// TODO: make singular, no varargs
function defineConstantsFac(production) {
    return function defineConstants(object /*, varargs*/) {
        if(arguments.length < 3)
            throw new Error('DEFINE_CONSTANTS expects 3 or more arguments, got '
                            + stringify(arguments))
        if(arguments.length % 2 === 0)
            throw new Error('DEFINE_CONSTANTS expects an odd number of arguments, got '
                            + stringify(arguments))
        if(typeof object !== 'string')
            throw new Error('DEFINE_CONSTANTS expects string parameters, got '
                            + stringify(arguments))

        var result = []
        for(var i = 1; i < arguments.length; i += 2) {
            var key = arguments[i]
            var value = arguments[i + 1]

            if(typeof key !== 'string' || typeof value !== 'string')
                throw new Error('DEFINE_CONSTANTS expects string parameters')

            if(key[0] === '@')
                key = key.substr(1)
            else
                key = '"' + key + '"'

            if(production)
                result.push(object + '[' + key + '] = ' + value)
            else
                result.push('Object.defineProperty(' + object + ', ' + key + ', ' +
                            '{configurable: false, enumerable: true, writable: false,' +
                            ' value: ' + value + '})')
        }

        return result.join(';')
    }
}

function defineAttributeFac(production) {
    return function defineAttribute(object, validator, key, value) {
        if(typeof object !== 'string' || typeof validator !== 'string'
                || typeof key !== 'string' || typeof value !== 'string')
            throw new Error('DEFINE_ATTRIBUTE expects string parameters, got '
                            + stringify(arguments))

        if(key[0] === '@')
            key = key.substr(1)
        else
            key = '"' + key + '"'

        if(production)
            return object + '[' + key + '] = ' + value
        else {
            var result = []
            result.push(';(function(value, validator) {')
                result.push('if(typeof validator !== "function")')
                result.push('{ throw new Error("Validator is not a function.") }')
                result.push('if(!validator(value))')
                result.push('{ throw new Error() }')

                result.push(';Object.defineProperty(')
                result.push(object)
                result.push(', ')
                result.push(key)
                result.push(', ')
                result.push('{configurable: false, enumerable: true, ')
                result.push('get: function() { return value }, ')
                result.push('set: function(newValue) { ')
                    result.push('if(!validator(newValue))')
                    result.push('{ throw new Error() }')
                    result.push('value = newValue')
                result.push('}')
                result.push('})')
            result.push('})(' + value + ', ' + validator + ');')
            return result.join(' ')
        }
    }
}



function writeConstantsFac(constants) {
    constants = constants || {}
    return function writeConstants(/*varargs*/) {
        // TODO: calling CONSTANTS() with no parameters yields arguments.length of 1
        var result = []
        for(var i = 0; i < arguments.length; i += 1) {
            var key = arguments[i]
            if(!(key in constants))
                throw new Error('No such constant "' + key + '".')
            var constant = constants[key]
            if(typeof constant !== 'string')
                constant = JSON.stringify(constant)
            result.push('const ' + key + ' = ' + constant)
        }
        result.push(';')
        result = result.join(';')
        
        return result
    }
}


export function getContext(opts) {
    if(arguments.length !== 1)
        throw new Error()
    
    let {constants, flags, flagList, data} = opts
    flags = flags || {}
    if(flagList) {
        for(let flag of flagList) {
            flags[flag] = true
        }
    }
    
    var production = !!(flags && flags.PRODUCTION)
    
    var result = {
        SANITY: sanityFac(production),
        SANITY_FAIL: sanityFailFac(production),
        DEFINE_CONSTANTS: defineConstantsFac(production),
        DEFINE_NO_ACCESS: noAccessFac(production),
        DEFINE_ATTRIBUTE: defineAttributeFac(production),
        CONSTANTS: writeConstantsFac(constants)
    }

    if(flags) {
        for(var key in flags) {
            if(flags[key])
                result[key] = true
        }
    }
    
    if(data) {
        for(var key in data) {
            result[key] = data[key]
        }
    }

    return result
}
