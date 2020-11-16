### deepReactFields ###
Create class controlled form

Example fromDebug.jsx
```
import ReactDOM from 'react-dom'
import React from 'react'

import PlanFormCfg from './forms/TestForm.jsx'
import DeepFields from 'reactDeepFields'
// DeepFields need your React version
const PlanForm = DeepFields(React, PlanFormCfg, {
  simpleArray: [{ fam: 'fam1', im: 'im1' }, { fam: 'fam2', im: 'im2' }]
})

document.dform = PlanForm
ReactDOM.render(<PlanForm.Component/>, document.getElementById('wrapper'))
```

Content of form config ./forms/TestForm.jsx
```
import React from 'react'
import Button from '@material-ui/core/Button'
import { TextField } from '@material-ui/core'
import '@babel/polyfill'

/* eslint-disable react/display-name, react/prop-types */
export default {
  name: 'planForm'
  props: {
    simpleArray: {
      react: (props) => {
        return <div>{props.children}</div>
      },
      newItem: {
        react: (props) => {
          return <div>{props.children}</div>
        },
        props: {
          fam: {
            validate: async (val) => {
              if (val && val.length > 5) throw new Error('Too long')
            },
            react: function (props) {
              props.field.state.value = props.field.state.value || ''
              return <TextField
                {...props.field.errorProps}
                defaultValue={props.field.state.value}
                onChange={(e) => {
                  props.field.state.value = e.target.value
                  props.field.validate()
                }}/>
            }
          },
          im: {},
          rmButton: {
            react: function (props) {
              return <Button onClick={(e) => {
                props.field.parent.drop()
              }}>RM</Button>
            }
          }
        }
      }
    },
    buttonYan: {
      react: function (props) {
        props.field.state.value = props.field.state.value || 0

        return <Button onClick={(e) => {
          props.field.state.value++
          props.field.update()

          props.field.parent.props.simpleArray.pushMember({ fam: 'TestFam' + props.field.state.value })

          props.form.validateAll().then((errors) => {
            console.log('validateAll', errors)
          })
        }}>Test button {props.field.name} {props.field.state.value}</Button>
      }
    }
  }
}
```

[Field class docs](Field.md)
