const { addCSSRules, computeCSS } = require('./cssRulesParser')
const { layout } = require('./layout')
const EOF = Symbol('EOF')  // EOF: End Of File

let currentToken = null
let currentAttribute = null
let currentTextNode = null

let stack = [{type: 'document', children: []}]

// 提交token
function emit(token) {
    let top = stack[stack.length - 1] // stack 最后一个元素

    if (token.type === 'startTag') {

        // 创建文档
        let element = {
            type: 'element',
            tagName: '',
            children: [],
            attributes: []
        }

        // 添加tagName
        element.tagName = token.tagName

        // 添加属性
        for (let p in token) {
            if (p !== 'type' && p !== 'tagName') {
                element.attributes.push({
                    name: p,
                    value: token[p]
                })
            }
        }

        top.children.push(element)
        element.parent = top

        computeCSS(element)

        if (!token.isSelfClosing) {
            stack.push(element)
        }

        currentTextNode = null
    } else if (token.type === 'endTag') {
        if (top.tagName !== token.tagName) {
            throw new Error(`Tag start:${top.tagName} end:${token.tagName} doesn't match!`)
        } else {

            if (top.tagName === 'style') { 
                //  添加css
                addCSSRules(top.children[0].content)
            }

            // layout 布局 不同属性不同ayout时机  toy-browser 只做 display:flex 布局
            layout(top)
            stack.pop()
        }
        currentTextNode = null
    } else if (token.type === 'text') {
        if (currentTextNode === null) {
            currentTextNode = {
                type: 'text',
                content: ''
            }
            top.children.push(currentTextNode)
        } 
        currentTextNode.content += token.content
    }

}

function parserHTML (html) {
    state = data
    for(let c of html) {
      // console.log(c)
        state = state(c)
    }
    state = state(EOF)
    return stack
}
// 状态 https://html.spec.whatwg.org/multipage/parsing.html#tokenization
function data(c) {
    if (c === '<') {
        return tagOpen
    } else if (c === EOF) {
        emit({
            type: 'EOF'
        })
        return
    } else {
        emit({
            type: 'text',
            content: c
        })
        return data
    }
}

// </
function tagOpen(c) {
    if (c === '/') {
        return endTagOpen
    } else if (c.match(/^[a-zA-Z]$/)) {
        currentToken = {
            type: 'startTag',
            tagName: ''
        }
        return tagName(c)
    } else {
        return data
    }
}

function endTagOpen(c) {
    if (c.match(/^[a-zA-A]$/)) {
        currentToken = {
            type: 'endTag',
            tagName: ''
        }
        return tagName(c)
    } else if (c === '>') {
        return data
    }
}


function tagName(c) {
    if (c === '/') {
        return selfClosingStartTag
    } else if (c.match(/^[\t\n\f ]$/)) {
        return beforeAttributeName
    } else if (c.match(/^[a-zA-Z]$/)) {
        currentToken.tagName += c //.toLowerCase()
        return tagName
    } else if (c === '>'){
        emit(currentToken)
        return data
    } else {
        return tagName
    }
}


function beforeAttributeName(c) {
    if (c.match(/^[\t\n\f ]$/)) { // <div     
        return beforeAttributeName
    } else if (c === '/' || c === '>' || c === EOF) {
        return afterAttributeName(c)
    } else if (c === '=') {
        return 
    } else { // 属性名
        currentAttribute = {
            name: '',
            value: ''
        }
        return attributeName(c)
    }
}

function attributeName(c) {
    if (c.match(/^[\t\n\f ]$/) || c === '/' || c === '>' || c === EOF) {
        return afterAttributeName(c)
    } else if (c === '=') {
        return beforeAttributeValue
    } else if (c === '\u0000') {

    } else if (c === '\"' || c === '\'' || c === '>') {

    } else {
        currentAttribute.name += c
        return attributeName
    }
}

function afterAttributeName(c) {
    if (c.match(/^[\t\n\f ]$/)) {
        return afterAttributeName
    } else if (c === '/') {
        return selfClosingStartTag
    } else if (c === '>') {
        emit(currentToken)
        return data
    } else if (c === EOF) {
        return attributeName(c)
    }
}

function beforeAttributeValue(c) {
    if (c.match(/^[\t\n\f ]$/)) {
        return beforeAttributeValue
    } else if (c === '\"') {
        return doubleQuotedAttributeValue
    } else if (c === '\'') {
        return singleQuotedAttributeValue
    } else if (c === '>') {

    } else {
        return unquotedAttributeValue(c)
    }
}

function doubleQuotedAttributeValue(c) {
    if (c === '\"') {
        currentToken[currentAttribute.name] = currentAttribute.value
        return afterQuotedAttributeValue
    } else if (c === '\u0000') {

    } else if (c === EOF) {

    } else {
        currentAttribute.value += c
        return doubleQuotedAttributeValue
    }
}

function singleQuotedAttributeValue(c) {
    if (c === '\'') {
        currentToken[currentAttribute.name] = currentAttribute.value
        return afterQuotedAttributeValue
    } else if (c === '\u0000') {

    } else if (c === EOF) {

    } else {
        currentAttribute.value += c
        return singleQuotedAttributeValue
    }
}

function afterQuotedAttributeValue(c) {
    if (c.match(/^[\t\n\f ]$/)) {
        return beforeAttributeName
    } else if (c=== '/') {
        return selfClosingStartTag
    } else if (c === '>') {
        emit(currentToken)
        return data
    } else if (c === EOF) {

    } else {
        return beforeAttributeName(c)
    }
}

function unquotedAttributeValue(c) {
    if (c.match(/^[\t\n\f ]$/)) {
        currentToken[currentAttribute.name] = currentAttribute.value
        return beforeAttributeName
    } else if  (c === '>') {
        currentToken[currentAttribute.name] = currentAttribute.value
        emit(currentToken)
        return  data
    } else if (c === '\u0000') {

    } else if (c === '\"' || c === '\'' || c === '<' || c === '=' || c === '\`') {

    } else if (c === EOF) {

    } else {
        currentAttribute.value += c
        return unquotedAttributeValue
    }
}




function selfClosingStartTag(c) {
    if (c === '>') {
        currentToken.isSelfClosing = true
        emit(currentToken)
        return data
    } else if (c === 'EOF') {

    } else {

    }
}



module.exports.parserHTML = parserHTML