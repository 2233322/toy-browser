const css = require('css')
const { cpuUsage } = require('process')
let rules = []

function match(element, selector) {
  let firstChar = selector[0]

  if (firstChar === '#') {
      let attr = element.attributes.filter(attr => attr.name === 'id')[0]
      if (attr && attr.value === selector.slice(1)) {
          return true
      }
  } else if (firstChar === '.') {
    let attr = element.attributes.filter(attr => attr.name === 'class')[0]

    // class = 'a'  class = 'a b c'
    // selector .a.b
    if (attr && attr.value.split(/[\t ]+/).length > 0) {
        let classValues = attr.value.split(/[\t ]+/)
        if (classValues.length === 1) {
            return classValues[0] === selector.slice(1)
        }

        selector = selector.split('.')
        selector.shift()
        // selector 都能在classValue中找到
        return selector.every(item => classValues.includes(item))
    }

  } else if (element.tagName === selector) {
      return true
  }


  return false
}


// 优先级
// body div #mayid
// [tagName, class, id, inline]
// [2, 0, 1, 0]
function specificity(selector) {
    // let p = [0, 0, 0, 0]
    let p = new Array(4).fill(0)
    let selectorParts = selector.split(/[\t ]+/)
    for (let part of selectorParts) {
        if (part.charAt(0) === '#') {
            p[2] += 1
        } else if (part.charAt(0) === '.') {
            p[1] += 1
        } else if (part.match(/^[a-zA-Z]/)) {
            p[0] += 1
        }
    }
    return p
}


/**
 * 
 * @param {原来优先级} sp1 
 * @param {单前优先级}} sp2 
 */
function compare(sp1, sp2) {
    if (sp1[3] - sp2[3]) {
        return sp1[3] - sp2[3]
    } else if (sp1[2] - sp2[2]) {
        return sp1[2] - sp2[2]
    } else if (sp1[1] - sp2[1]) {
        return sp1[1] - sp2[1]
    } else {
        return sp1[0] - sp2[0]
    }
}

function addCSSRules (text) {
     let ast = css.parse(text)
    //console.log(JSON.stringify(ast, null, '    '))
    rules.push(...ast.stylesheet.rules)
} 

function computeCSS(element) {
    let el = element
    let elements = []

    while(!!el.parent) {
        elements.push(el.parent)
        el = el.parent
    }

    // computedStyle delment的style
    if (!element.computedStyle) {
        element.computedStyle = {}
    }

    for (let rule of rules) {
        let matched = false
        let selectorParts = rule.selectors[0].split(' ').reverse()
        
        if (!match(element, selectorParts[0])) {
            continue
        }

        
        if (selectorParts.length === 1) {
            // 如果selectorParts只有一个 matched为true
            matched = true
        } else {
            let j = 1 // selectorParts指针

            // i elements 指针
            for (let i = 0; i < elements.length; i++) {
               if (match(elements[i], selectorParts[j])) {

                   // 规则匹配到了跳出循环
                   if (j === selectorParts.length - 1) {
                       matched = true
                       break
                   }
                   j++
               }
            }
        }

        // 如果匹配到加入rule
        if (matched) {
            console.log('Element:', element.tagName, 'match rule:', rule.selectors)
            let sp = specificity(rule.selectors[0])
            let computedStyle = element.computedStyle
            for (let declaration of rule.declarations) {
                if (!computedStyle[declaration.property]) {
                    computedStyle[declaration.property] = {}
                }
                // 如果没有specificity 或者当前specificity高就应用该条属性
                if (!computedStyle[declaration.property].specificity || compare(computedStyle[declaration.property].specificity, sp) < 0) {
                    computedStyle[declaration.property].value = declaration.value
                    computedStyle[declaration.property].specificity = sp
                }
            }
        }
    }
}

module.exports = {
    addCSSRules,
    computeCSS
}