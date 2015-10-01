import _ from 'lodash'
import { mapEvents } from 'sigh-core/lib/stream'


function preprocessTask(opts) {
    const preprocess = require('preprocess').preprocess
    const path = require('path')
    const context = require('./context').getContext(opts)

    return event => {
        let type = event.fileType
        if(type === 'es6' || type === 'tag')
            type = 'js'

        const data = preprocess(event.data, context, {srcDir: path.dirname(event.projectPath), type})

        return {data, sourceMap: undefined}
    }
}

function adaptEvent(compiler) {
    return event => {
        if(event.type !== 'add' && event.type !== 'change')
            return event

        return compiler(_.pick(event, 'type', 'data', 'projectPath', 'fileType')).then(result => {
            event.data = result.data

            if(result.sourceMap)
                event.applySourceMap(JSON.parse(result.sourceMap))

            event.changeFileSuffix('js')
            return event
        })
    }
}


let pooledProc
export default function(op, opts={}) {
    if(!pooledProc)
        pooledProc = op.procPool.prepare(preprocessTask, opts, {module})

    return mapEvents(op.stream, adaptEvent(pooledProc))
}
