import _ from 'lodash'
import ProcessPool from 'process-pool'
import { Bacon } from 'sigh-core'
import Event from 'sigh/lib/Event'

import preprocess from '../'

require('source-map-support').install()
require('chai').should()

describe('sigh-preprocess', () => {
  var procPool
  beforeEach(() => { procPool = new ProcessPool() })
  afterEach(() => { procPool.destroy() })

  xit('TODO: should do something', () => {
    // TODO:
  })
})
