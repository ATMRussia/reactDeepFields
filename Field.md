<a name="Field"></a>

## Field
**Kind**: global class  

* [Field](#Field)
    * [new Field(config, value, nameOverride, parent)](#new_Field_new)
    * [.value](#Field+value) ⇒ <code>Any</code>
    * [.value](#Field+value) ⇒ <code>void</code>
    * [.errorProps](#Field+errorProps) ⇒ <code>Object</code>
    * [.form](#Field+form) ⇒ [<code>Field</code>](#Field)
    * [.Component](#Field+Component) ⇒ <code>function</code>
    * [.pushMember(value)](#Field+pushMember) ⇒ <code>void</code>
    * [.rmChild(childField)](#Field+rmChild) ⇒ <code>void</code>
    * [.rmMember(idx, count)](#Field+rmMember) ⇒ <code>void</code>
    * [.drop()](#Field+drop) ⇒ <code>void</code>
    * [.toParent(iter)](#Field+toParent) ⇒ <code>void</code>
    * [.call()](#Field+call) ⇒ <code>any</code>
    * [.validate()](#Field+validate) ⇒ <code>Error</code>
    * [.validateAll()](#Field+validateAll) ⇒ <code>Array</code>
    * [.eachParent(iter)](#Field+eachParent) ⇒ <code>void</code>
    * [.makePath()](#Field+makePath) ⇒ <code>Array</code>
    * [.update()](#Field+update) ⇒ <code>void</code>

<a name="new_Field_new"></a>

### new Field(config, value, nameOverride, parent)
constructor - Create new Field instance

**Returns**: [<code>Field</code>](#Field) - this field  

| Param | Type | Description |
| --- | --- | --- |
| config | <code>Object</code> | field config [example](Config.md) |
| value | <code>Any</code> | defaultValue |
| nameOverride | <code>string</code> | optional field name |
| parent | [<code>Field</code>](#Field) | optional parentField |

<a name="Field+value"></a>

### field.value ⇒ <code>Any</code>
get value - Value of this field and child fields

**Kind**: instance property of [<code>Field</code>](#Field)  
**Returns**: <code>Any</code> - value  
<a name="Field+value"></a>

### field.value ⇒ <code>void</code>
set value - Set value of this field, validate

**Kind**: instance property of [<code>Field</code>](#Field)  

| Param | Type | Description |
| --- | --- | --- |
| val | <code>type</code> | new value |

<a name="Field+errorProps"></a>

### field.errorProps ⇒ <code>Object</code>
get errorProps - Get object with error and helperText props

**Kind**: instance property of [<code>Field</code>](#Field)  
**Returns**: <code>Object</code> - error and helperText  
<a name="Field+form"></a>

### field.form ⇒ [<code>Field</code>](#Field)
get form - Get upper field - form

**Kind**: instance property of [<code>Field</code>](#Field)  
**Returns**: [<code>Field</code>](#Field) - Top level field  
<a name="Field+Component"></a>

### field.Component ⇒ <code>function</code>
get Component - Get React Component function

**Kind**: instance property of [<code>Field</code>](#Field)  
**Returns**: <code>function</code> - React component function  
<a name="Field+pushMember"></a>

### field.pushMember(value) ⇒ <code>void</code>
pushMember - Push new array member

**Kind**: instance method of [<code>Field</code>](#Field)  

| Param | Type | Description |
| --- | --- | --- |
| value | <code>type</code> | defaultValue |

<a name="Field+rmChild"></a>

### field.rmChild(childField) ⇒ <code>void</code>
rmChild - remove child field

**Kind**: instance method of [<code>Field</code>](#Field)  

| Param | Type | Description |
| --- | --- | --- |
| childField | [<code>Field</code>](#Field) | child field |

<a name="Field+rmMember"></a>

### field.rmMember(idx, count) ⇒ <code>void</code>
rmMember - Remove child by index

**Kind**: instance method of [<code>Field</code>](#Field)  

| Param | Type | Description |
| --- | --- | --- |
| idx | <code>type</code> | child index |
| count | <code>type</code> | count of items |

<a name="Field+drop"></a>

### field.drop() ⇒ <code>void</code>
drop - Drop this item at parent array

**Kind**: instance method of [<code>Field</code>](#Field)  
<a name="Field+toParent"></a>

### field.toParent(iter) ⇒ <code>void</code>
toParent - Iterate all fields up to top

**Kind**: instance method of [<code>Field</code>](#Field)  

| Param | Type | Description |
| --- | --- | --- |
| iter | <code>function</code> | function(Field){} |

<a name="Field+call"></a>

### field.call() ⇒ <code>any</code>
call - Call function from config with context = this field

**Kind**: instance method of [<code>Field</code>](#Field)  
**Returns**: <code>any</code> - function result  

| Param | Type | Description |
| --- | --- | --- |
| ...args | <code>any</code> | first argument is function name |

<a name="Field+validate"></a>

### field.validate() ⇒ <code>Error</code>
async validate - Validate this field, update state and readraw React Component

**Kind**: instance method of [<code>Field</code>](#Field)  
**Returns**: <code>Error</code> - Optional error  
<a name="Field+validateAll"></a>

### field.validateAll() ⇒ <code>Array</code>
async validateAll - Validate all child fields

**Kind**: instance method of [<code>Field</code>](#Field)  
**Returns**: <code>Array</code> - Errors array  
<a name="Field+eachParent"></a>

### field.eachParent(iter) ⇒ <code>void</code>
eachParent - Iterate each parent field

**Kind**: instance method of [<code>Field</code>](#Field)  

| Param | Type | Description |
| --- | --- | --- |
| iter | <code>function</code> | Iterate function |

<a name="Field+makePath"></a>

### field.makePath() ⇒ <code>Array</code>
makePath - Calculate path of this field

**Kind**: instance method of [<code>Field</code>](#Field)  
**Returns**: <code>Array</code> - Path of this field  
<a name="Field+update"></a>

### field.update() ⇒ <code>void</code>
update - Redraw react component

**Kind**: instance method of [<code>Field</code>](#Field)  
