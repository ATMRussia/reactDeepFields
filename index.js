module.exports = function (React, cfg, values) {
  class Field {
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
      const { props, newItem, name, type, ...stripedConfig } = config
      const tField = this
      this.config = stripedConfig
      this.parent = parent
      this.name = nameOverride || name
      this.state = {}

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
        if (propsCnt)
          this.state.value = val
      } else {
        this.type = type || 'prop'
        this.state.value = val
      }
      this.path = this.makePath()
      this.pathStr = this.path.join('.')
      this.validate()
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

    /**
     * get value - Value of this field and child fields
     *
     * @return {Any}  value
     */
    get value () {
      var val
      if (this.type === 'array') {
        val = []
        this.props.forEach((child) => {
          val.push(child.value)
        })
        return val
      } else if (this.type === 'object') {
        val = {}
        for (var key in this.props) {
          val[key] = this.props[key].value
        }
        return val
      } else {
        return this.state.value
      }
    }

    /**
     * get errorProps - Get object with error and helperText props
     *
     * @return {Object}  error and helperText
     */
    get errorProps () {
      return {
        error: !!this.state.error,
        helperText: this.state.error ? this.state.error.message : null
      }
    }

    /**
     * async validate - Validate this field, update state and readraw React Component
     *
     * @return {Error}  Optional error
     */
    async validate () {
      if (!this.config.validate) return
      try {
        await this.config.validate(this.state.value)
        this.state.error && this.setState({ ...this.state, error: null })
        return
      } catch (err) {
        this.setState({ ...this.state, error: err })
        return err
      }
    }

    /**
     * async validateAll - Validate all child fields
     *
     * @return {Array}  Errors array
     */
    async validateAll () {
      var errors = []
      const pushIfError = async (field, validateFuncName) => {
        const err = await field[validateFuncName]()
        if (err && err instanceof Array) {
          errors = errors.concat(err)
        } else if (err) {
          errors.push({
            field: field,
            err: err
          })
        }
      }
      await pushIfError(this, 'validate')
      for (var key in this.props) {
        await pushIfError(this.props[key], 'validateAll')
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
        path.push(fieldObj.name)
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
          console.log('.react = "%s"', this.config.react)
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

  if (cfg) return new Field(cfg, values)
  return Field
}
