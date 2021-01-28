const EventEmitter = require('events')
function DeepFields (React, cfg, values, mainOptions) {
  const options = {
    reqErrorText: 'Поле должно быть заполненно',
    ...mainOptions,
    serverSide: (mainOptions && mainOptions.serverSide) || !React
  }

  const requiredValidator = async (val) => {
    if (!val) throw new Error(options.reqErrorText)
  }

  class Field extends EventEmitter {
    /**
     * constructor - Create new Field instance
     *
     * @param  {Object} config field config [example](Config.md)
     * @param  {Any}   value  defaultValue
     * @param  {string} nameOverride optional field name
     * @param  {Field} parent optional parentField
     * @return {Field}        this field
     */
    constructor (config, value, nameOverride, parent) {
      super()
      const {
        props, newItem, name, type, validate, nextTickValidate,
        onCreate, roleAndSteps, readOnlySteps, setNullSteps, ...stripedConfig
      } = config
      const tField = this
      this.config = stripedConfig
      this.parent = parent
      this.name = nameOverride || name
      this.state = {}
      this.validators = []
      this.roleAndSteps = roleAndSteps || (parent && parent.roleAndSteps)
      this.readOnlySteps = readOnlySteps || (parent && parent.readOnlySteps)
      this.step = (parent && parent.step) || (value && value.step) || 1
      validate && this.validators.push(validate)
      nextTickValidate && this.validators.push(nextTickValidate)
      this.onCreateFunctions = [...((parent && parent.onCreateFunctions) || [])]
      onCreate && this.onCreateFunctions.push(onCreate)

      // default setState function
      this.setState = (newState) => {
        tField.state = newState
      }

      var val = value || stripedConfig.defaultValue
      if (newItem) {
        this.type = 'array'
        this.props = []
        this.newItem = newItem
        val = val || []
        val.forEach(tField.pushMember.bind(tField))
      } else if (props) {
        this.type = 'object'
        this.props = {}
        val = { ...val } || {}
        var propsCnt = 0
        for (var key in props) {
          propsCnt++
          tField.props[key] = new Field(props[key], val[key], key, tField)
          delete val[key]
        }
        if (propsCnt) {
          this.state.value = val
        }
      } else {
        this.type = type || 'prop'
        if (type === 'date') {
          this.state.value = val ? new Date(val) : val
        } else {
          this.state.value = val
        }
      }
      this.path = this.makePath()
      this.pathStr = this.path.join('.')

      this.callCreateFunctions()
      this.setupRoleProperties()
      if (!options.serverSide) {
        // some fields needs to run validation only in next tick
        !nextTickValidate ? this.validate() : setTimeout(() => {
          this.validate()
        }, 0)
      }

      if (!this.parent) {
        this.stepValues = []
      }
    }

    callCreateFunctions (recursiveWithChilds) {
      this.onCreateFunctions.forEach((func) => {
        func.apply(this)
      })
      if (!recursiveWithChilds) return
      for (var key in this.props) {
        this.props[key].callCreateFunctions(true)
      }
    }

    pushStep () {
      const lastStepVal = this.stepValues[this.stepValues.length - 1]
      options.dbg && console.log(`pushStep lastStep:${lastStepVal && lastStepVal.step} curStep:${this.step}`)
      if (lastStepVal && this.step === lastStepVal.step) {
        lastStepVal.value = this.value
        lastStepVal.upd = this.getUpdates()
      } else {
        this.stepValues.push({
          step: this.step,
          value: this.value,
          upd: this.getUpdates()
        })
      }
      options.dbg && console.log('stepValues:', [...this.stepValues])
    }

    setStep (step) {
      options.dbg && console.log('setStep', step)
      const newStep = step || this.step
      if (newStep === this.step) {
        return
      }

      this.step = newStep
      for (var key in this.props) {
        this.props[key].setStep(newStep)
      }
      this.setupRoleProperties()
    }

    setValues (values) {
      switch (this.type) {
        case 'array' : {
          const newValuesLen = ((values && values.length) || 0)
          while (newValuesLen < this.props.length) {
            this.rmMember(this.props.length - 1, 1)
          }
          for (let i = 0; i < newValuesLen; i++) {
            if (this.props[i]) {
              this.props[i].setValues(values[i])
            } else {
              this.pushMember(values[i])
            }
          }
        }
          break
        case 'object' :
          for (const key in this.props) {
            values[key] !== undefined && this.props[key].setValues(values[key])
          }
          break
        case 'date' :
          this.state.value = values ? new Date(values) : values
          break
        default : {
          this.state.value = values
        }
      }
    }

    allowedAt (rolesObj) {
      if (!rolesObj) return false
      const allowedAtSteps = [];
      (options.userRoles || []).forEach((role) => {
        rolesObj[role] && rolesObj[role].forEach((step) => {
          !allowedAtSteps.includes(step) && allowedAtSteps.push(step)
        })
      })
      return allowedAtSteps.includes(this.step)
    }

    get roles () {
      return options.userRoles ? [...options.userRoles] : []
    }

    setupRoleProperties () {
      const before = {};
      ['silentValidate', 'skipValidate', 'skipValue', 'readOnly'].forEach((key) => {
        this[key] = !!this[key]
        before[key] = this[key]
      })

      this.allowSetNull = false
      if (this.setNullSteps) {
        this.allowSetNull = this.allowedAt(this.setNullSteps)
      }

      if (this.roleAndSteps) {
        const found = this.allowedAt(this.roleAndSteps)
        const silentValidate = this.allowedAt(this.config.silentValidate)
        if (silentValidate) {
          this.silentValidate = true
          this.skipValidate = false
        } else {
          this.skipValidate = !found
        }
        this.skipValue = !found
        this.readOnly = !found || this.config.readOnly
      } else if (this.readOnlySteps) {
        this.readOnly = this.allowedAt(this.readOnlySteps) || this.config.readOnly
      }

      var changed = false
      for (var key in before) {
        changed = changed || (before[key] !== this[key])
      }
      this.dbg = this.dbg || {}
      this.dbg.changed = changed

      changed && this.update()
    }

    /**
     * pushMember - Push new array member
     *
     * @param  {type} value defaultValue
     * @return {void}
     */
    pushMember (value) {
      if (this.type !== 'array') {
        throw new Error(`${this.name} is not array`)
      }
      if (!this.newItem) {
        throw new Error(`${this.name}.newItem is undefined`)
      }
      this._childId = this._childId || 0
      this._childId++

      // insert object (props block)
      const newChildField = new Field({
        ...this.newItem
      }, value, (this.newItem.name || '') + this._childId, this)
      this.props.push(newChildField)

      if (this._Component) {
        this._childs.push(newChildField.reactElement())
        this.update()
      }
    }

    /**
     * rmChild - remove child field
     *
     * @param  {Field} childField child field
     * @return {void}
     */
    rmChild (childField) {
      if (this.type !== 'array') {
        throw new Error(`${this.name} is not array`)
      }

      const idx = this.props.indexOf(childField)
      if (idx === -1) throw new Error('Not found')

      this.rmMember(idx, 1)
    }

    /**
     * rmMember - Remove child by index
     *
     * @param  {type} idx   child index
     * @param  {type} count count of items
     * @return {void}
     */
    rmMember (idx, count) {
      if (this.type !== 'array') {
        throw new Error(`${this.name} is not array`)
      }

      if (!(this._childs[idx] && this.props[idx])) {
        throw new Error(`${this.name} has not item[${idx}]`)
      }
      this._childs.splice(idx, count || 1)
      this.props.splice(idx, count || 1)
      this.update()
    }

    /**
     * drop - Drop this item at parent array
     *
     * @return {void}
     */
    drop () {
      this.parent && this.parent.rmChild(this)
    }

    /**
     * toParent - Iterate all fields up to top
     *
     * @param  {function} iter function(Field){}
     * @return {void}
     */
    toParent (iter) {
      iter(this)
      this.eachParent(iter)
    }

    _getValue (useFilter) {
      var val
      if (this.type === 'array') {
        val = []
        this.props.forEach((child) => {
          val.push(child._getValue(useFilter))
        })
        return val
      } else if (this.type === 'object') {
        val = {}
        for (var key in this.props) {
          if (!this.props[key].skipValue || !useFilter) {
            val[key] = this.props[key]._getValue(useFilter)
          } else if (this.allowSetNull && (this.props[key]._getValue(useFilter) === null)) {
            console.log('setNull!', this.name)
            val[key] = null
          }
        }
        if (!this.parent) {
          val.step = this.step
        }
        return val
      } else {
        return this.state.value
      }
    }

    /**
     * get value - Value of this field and child fields
     *
     * @return {Any}  value
     */
    get value () {
      return this._getValue(true)
    }

    /**
     * get fullValue - Value of this field and child fields without filter
     *
     * @return {Any}  value without filter
     */
    get fullValue () {
      return this._getValue(false)
    }

    getUpdates (parentUpd) {
      const upd = parentUpd || {}
      if (this.type === 'array') {
        const val = []
        for (var i = 0; i < this.props.length; i++) {
          val.push(this.props[i].value)
        }
        // override array
        upd[this.pathStr] = val
      } else if (this.type === 'object') {
        for (var key in this.props) {
          !this.props[key].skipValue && this.props[key].getUpdates(upd)
        }
      } else {
        if (!this.skipValue) {
          upd[this.pathStr] = this.state.value
        }
      }
      // update form step
      if (this.config.useSteps) {
        upd.step = this.step || 1
      }
      return upd
    }

    getStepsUpdate () {
      const upd = {}
      this.stepValues.forEach((stepValue) => {
        Object.assign(upd, stepValue.upd)
      })
      Object.assign(upd, this.getUpdates())
      return upd
    }

    /**
     * set value - Set value of this field, validate
     *
     * @param  {type} val new value
     * @return {void}
     */
    set value (val) {
      const oldVal = this.state.value
      this.state.value = val
      oldVal !== val && this.validate(true).then(() => {
        this.update()
        this.config.afterChange && this.config.afterChange.apply(this, [val])
      })
    }

    /**
     * get haveErrors - Have at least one error
     *
     * @return {Boolean}
     */
    get haveErrors () {
      if (this.state.error) return true
      for (const key in this.props) {
        if (this.props[key].haveErrors) return true
      }
      return false
    }

    async stepAndValue (step, val) {
      const prevVal = this.state.value
      this.state.value = val

      const errors = await this.form.validateAll([], false)
      options.dbg && console.log('stepAndValue2 errs', errors, this, this.form)
      if (errors.length) {
        // fallback
        this.value = prevVal
        this.setupRoleProperties()
        options.dbg && console.log('stepAndValue bad return prevVal', prevVal)
        return errors
      }
      options.dbg && console.log('stepAndValue good')
      this.form.pushStep()
      this.form.setStep(step) // go to new step
      this.value = val // set value and trigger validators
      return null
    }

    /**
     * get errorProps - Get object with error and helperText props
     *
     * @return {Object}  error and helperText
     */
    get errorProps () {
      return {
        error: this.state.error ? true : null,
        helperText: this.state.error ? this.state.error.message : null
      }
    }

    /**
     * call - Call function from config with context = this field
     *
     * @param  {any} ...args first argument is function name
     * @return {any}         function result
     */
    call (...args) {
      const name = args.shift()
      if (!name || !this.config[name]) return

      return this.config[name].apply(this, args)
    }

    /**
     * async validate - Validate this field, update state and readraw React Component
     *
     * @return {Error}  Optional error
     */
    async validate (skipSetState, parentActions) {
      if (this.skipValidate) {
        // options.dbg && console.log('skipValidate', this.name)
        return
      }
      const err = await this.forceValidate(parentActions)
      if (err) {
        this.state.error = err
        !skipSetState && this.setState({ ...this.state })
      } else {
        !skipSetState && this.state.error && this.setState({ ...this.state, error: null })
        delete this.state.error
      }
      return err
    }

    async forceValidate (parentActions) {
      // options.dbg && console.log('forceValidate', this.name)
      let validators = this.validators
      if (this.config.req) {
        validators = [requiredValidator, ...validators]
      }
      for (var i = 0; i < validators.length; i++) {
        try {
          const actions = await validators[i].apply(this, [this.state.value])
          actions && parentActions && parentActions.splice(parentActions.length, 0, ...actions)
        } catch (err) {
          // skip error
          if (this.silentValidate) {
            options.dbg && console.log('silentValidate', err)
          }
          return err
        }
      }
      return null
    }

    /**
     * async validateAll - Validate all child fields
     *
     * @return {Array}  Errors array
     */
    async validateAll (parentErrors, skipSetState, parentActions) {
      // options.dbg && console.log('validateAll', parentErrors, skipSetState)
      const errors = parentErrors || []
      const actions = parentActions || []

      const thisErr = await this.validate(skipSetState === undefined ? true : skipSetState, actions)
      thisErr && errors.push({
        field: this,
        err: thisErr
      })

      for (var key in this.props) {
        await this.props[key].validateAll(errors, skipSetState, actions)
      }
      if (this === this.form) {
        while (actions.length) {
          const action = actions.shift()
          options.dbg && console.log('validate, action', action)
          if (!(errors.length === 0 || action.withError)) continue
          if (action.gotoStep && this.step !== action.gotoStep) {
            this.pushStep()
            this.setStep(action.gotoStep)
          }
        }
      }
      return errors
    }

    /**
     * get form - Get upper field - form
     *
     * @return {Field}  Top level field
     */
    get form () {
      if (this._form) return this._form
      this._form = this.parent ? this.parent.form : this
      return this._form
    }

    /**
     * eachParent - Iterate each parent field
     *
     * @param  {function} iter Iterate function
     * @return {void}
     */
    eachParent (iter) {
      var cur = this.parent
      while (cur) {
        iter(cur)
        cur = cur.parent
      }
    }

    /**
     * makePath - Calculate path of this field
     *
     * @return {Array}  Path of this field
     */
    makePath () {
      var path = []
      this.toParent((fieldObj) => {
        fieldObj.parent && path.push(fieldObj.name)
      })
      return path.reverse()
    }

    /**
     * update - Redraw react component
     *
     * @return {void}
     */
    update () {
      this.setState && this.setState({ ...this.state })
      this.emit('update')
    }

    reactElement () {
      if (this._Component) return this._Component

      var childs = []
      var newReactElement
      const props = {
        key: this.pathStr,
        field: this,
        form: this.form
      }

      this._childs = childs
      if (this.type === 'object' || this.type === 'array') {
        for (var key in this.props) {
          childs.push(this.props[key].reactElement())
        }
      }

      if (this.config.react) {
        if (typeof (this.config.react) !== 'function') {
          options.dbg && console.log('.react = "%s"', this.config.react)
          throw new Error('react prop is not a function')
        }
        newReactElement = React.createElement(this.Assign(this.config.react), props, ...childs)
        // props.reactFunc = this.config.react
        // newReactElement = React.createElement(WrapperDeepField, props, ...childs)
      } else {
        newReactElement = React.createElement(React.Fragment, null, ...childs)
      }
      if (!React.isValidElement(newReactElement)) {
        throw new Error(`${this.pathStr} prop react function does not return ReactElement`)
      }
      this._Component = newReactElement
      return this._Component
    }

    /**
     * get Component - Get React Component function
     *
     * @return {function}  React component function
     */
    get Component () {
      const ret = this.reactElement()
      const topWrapperFunc = (props) => {
        return ret
      }
      topWrapperFunc.displayName = this.name + 'Wrapper'
      return topWrapperFunc
    }

    Assign (componentFunc) {
      const tField = this
      const wrapperFunc = (props) => {
        const [state, setState] = React.useState(tField.state) // eslint-disable-line
        tField.setState = (newState) => {
          tField.state = newState
          setState(newState)
        }
        return componentFunc({
          ...props,
          children: tField._childs
        })
      }
      wrapperFunc.displayName = (this.parent && this.parent.type === 'array') ? (this.parent.name + 'Item') : this.name
      return wrapperFunc
    }
  }

  cfg.extend && cfg.extend(Field)

  if (cfg) return new Field(cfg, values)
  return Field
}


/**
 * cloneCfg - Deep immutable config clone
 *
 * @param  {Object} srcCfg Src config to clone
 * @return {Object}        Clone of config
 */
function cloneCfg (srcCfg) {
  const ret = {
    ...srcCfg
  }
  if (srcCfg.newItem) ret.newItem = cloneCfg(srcCfg.newItem)
  if (srcCfg.props) {
    let props = (srcCfg.props instanceof Array) ? [ ...srcCfg.props ] : { ...srcCfg.props }
    for (let key in props) {
      props[key] = cloneCfg(props[key])
    }
    ret.props = props
  }
  return ret
}
DeepFields.cloneCfg = cloneCfg
module.exports = DeepFields
