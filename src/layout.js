function getStyle(element) {
    if (!element.style) {
        element.style = {}
    }
    
    for(let prop in element.computedStyle) {
        element.style[prop] = element.computedStyle[prop].value

        // 把px 换成 number   string(100px) => number(100)
        if (element.style[prop].toString().match(/px$/)) {
            element.style[prop] = parseInt(element.style[prop])
        }

        if (element.style[prop].toString().match(/^[0-9\.]+$/)) {
            element.style[prop] = parseInt(element.style[prop])
        }
    }

    return element.style
}

function layout(element) {
    if (JSON.stringify(element.computedStyle) === '{}') {
        return
    }

    let elementStyle = getStyle(element)

    // 只处理display: flex
    if (elementStyle.display !== 'flex') {
        return
    }

    // 子元素 只保存element节点
    let items = element.children.filter(child => child.type === 'element')

    let style = elementStyle

    // 如果不是确定尺寸就把style.width style.height 设置为null 方便后面判断
    void ['width', 'height'].forEach(size => {
        if (style[size] === 'auto' || style[size] === '' || style[size] === void 0 ) {
            style[size] = null
        }
    })

    // 初始化默认值
    if (!style['flex-direction'] || style['flex-direction'] === 'auto') {
        style['flex-direction'] = 'row'
    }
    if (!style['flex-wrap'] || style['flex-wrap'] === 'auto') {
        style['flex-wrap'] = 'nowrap'
    }
    if (!style['justify-content'] || style['justify-content'] === 'auto') {
        style['justify-content'] = 'flex-start'
    }
    if (!style['align-items'] || style['align-items'] === 'auto') {
        style['align-items'] = 'stretch'
    }
    if (!style['align-content'] || style['align-content'] === 'auto') {
        style['align-content'] = 'stretch'
    }



    // 抽象一个排版信息
    let mainSize, mainStart, mainEnd, mainSign, mainBase,
        crossSize, crossStart, crossEnd, crossSign, crossBase

    if (style['flex-direction'] === 'row') {
        mainSize = 'width'
        mainStart = 'left'
        mainEnd = 'right'
        mainSign = +1
        mainBase = 0

        crossSize = 'height'
        crossStart = 'top'
        crossEnd = 'bottom'
    }

    if (style['flex-direction'] === 'row-reverse') {
        mainSize = 'width'
        mainStart = 'right'
        mainEnd = 'left'
        mainSign = -1
        mainBase = style.width

        crossSize = 'height'
        crossStart = 'top'
        crossEnd = 'bottom'
    }

    if (style['flex-direction'] === 'column') {
        mainSize = 'height'
        mainStart = 'top'
        mainEnd = 'bottom'
        mainSign = +1
        mainBase = 0

        crossSize = 'width'
        crossStart = 'left'
        crossEnd = 'right'
    }

    if (style['flex-direction'] === 'column-reverse') {
        mainSize = 'height'
        mainStart = 'bottom'
        mainEnd = 'top'
        mainSign = -1
        mainBase = style.height

        crossSize = 'width'
        crossStart = 'left'
        crossEnd = 'right'
    }

    if (style['flex-wrap'] === 'wrap-reverse') {
        let tmp = crossStart
        crossStart = crossEnd
        crossEnd = tmp
        crossSign = -1
    } else {
        crossSign = +1
        crossBase = 0
    }

    // 如果没有设置mainSize atuo sizing  mainSize就是所有子元素mainSize之和
    let isAutoMainSize = false
    if (!style[mainSize]) {
        elementStyle[mainSize] = 0
        for (let item of items) {
            let itemStyle = getStyle(item)
            if (itemStyle[mainSize] !== null && itemStyle[mainSize] !== undefined) {
                elementStyle[mainSize] += itemStyle[mainSize]
            }
        }
        isAutoMainSize = true
    }


    let flexLine = []
    let flexLines = [flexLine]

    // 剩余空间
    let mainSpace = elementStyle[mainSize]

     // 交叉轴占空间
    let crossSpace = 0

    // 元素收进行 flexLines
    for (let i = 0; i < items.length; i++) {
        let item = items[i]
        let itemStyle = item.style
        

        
        if (itemStyle[mainSize] === undefined) {
            itemStyle[mainSize] = 0
        }

        // flex: 1 1 0%   flex:1  自动缩放不换行 先处理
        if (itemStyle.flex === 1) {
            flexLine.push(item)
        } else if (style['flex-wrap'] === 'nowrap' || isAutoMainSize) {
            mainSpace -= itemStyle[mainSize]
            if (itemStyle[crossSize] !== null && itemStyle[crossSize] !== void 0) {
                crossSpace = Math.max(crossSpace, itemStyle[crossSize])
            }
            flexLine.push(item)
        } else {

            // 如果一个子元素mainSzie > 父元素mainSize 那么把子元素mainSzie缩小到父元素mainSzie
            if (itemStyle[mainSize] > style[mainSize]) {
                itemStyle[mainSize] = style[mainSize]
            }

            // 需要换行
            if (mainSpace < itemStyle[mainSize]) {
                // 保存上一行信息
                flexLine.mainSpace = mainSpace
                flexLine.crossSpace = crossSpace

                flexLine = [item]
                flexLines.push(flexLine)
                mainSpace = style[mainSize]
                crossSpace = 0
            
            } else {
                flexLine.push(item)
            }

            if (itemStyle[crossSize] !== null && itemStyle[crossSize] !== void 0) {
                crossSpace = Math.max(crossSpace, itemStyle[crossSize])
            }

            mainSpace -= itemStyle[mainSize]
        }
    }

    flexLine.mainSpace = mainSpace

    // crossSpace

    if (style['flex-wrap'] === 'nowrap' || isAutoMainSize) {
        flexLine.crossSpace = (style[crossSize] !== void 0) ? style[crossSize] : crossSpace
    } else {
        flexLine.crossSpace = crossSpace
    }


    // 计算主轴 把主轴位置先放好
    if (mainSpace < 0) {
        // 缩放倍数
        let scale = style[mainSize] / (style[mainSize] - mainSpace)
        let currentMain = mainBase
        for (let i = 0; i < items.length; i++) {
            let item = items[i]
            let itemStyle = item.style


            if (itemStyle['flex'] === 1) {
                itemStyle[mainSize] = 0
            } else {
                itemStyle[mainSize] *= scale
            }

            itemStyle[mainStart] = currentMain
            itemStyle[mainEnd] = itemStyle[mainStart] + mainSign * itemStyle[mainSize]
            currentMain = itemStyle[mainEnd]
        }
    } else {
        flexLines.forEach(flexLine => {
            let mainSpace = flexLine.mainSpace

            // flex: 1 暂时只处理种情况
            // flex: 1  就是 flex: 1 1 0% 个数
            let flex1Total = 0
            for (let i = 0 ; i < flexLine.length; i++) {
                let item = flexLine[i]
                let itemStyle = item.style
                if (itemStyle['flex'] === 1 || itemStyle['flex'] === '1 1 0%' || itemStyle['flex'] === '1 1 0') {
                    flex1Total++
                }
            }

            // 根据是否flex
            if (flex1Total > 0) {
                let currentMain = mainBase
                for (let i = 0; i < flexLine.length; i++) {
                    let item = flexLine[i]
                    let itemStyle = item.style

                    if (itemStyle['flex'] === 1 || itemStyle['flex'] === '1 1 0%' || itemStyle['flex'] === '1 1 0') {
                        itemStyle[mainSize] = mainSpace / flex1Total
                    }

                    itemStyle[mainStart] = currentMain
                    itemStyle[mainEnd] = itemStyle[mainStart] + mainSign * itemStyle[mainSize]
                    currentMain = itemStyle[mainEnd]
                }
            } else { // 没有flex：1   就根据justify-content 计算 mainStart  mainEnd
                let currentMain, step
                // justify-content: flex-start | flex-end | center | space-between | space-around;
                switch (style['justify-content']) {
                    case 'flex-end':
                        currentMain = mainSpace * mainSign + mainBase
                        step = 0
                        break
                    case 'content':
                        currentMain = mainSpace / 2 * mainSign + mainBase
                        step = 0
                        break
                    case 'space-between':
                        currentMain = mainBase
                        step = mainSpace / (flexLine.length - 1) * mainBase
                        break
                    case 'space-around':
                        step = mainSpace / flexLine.length * mainSign
                        currentMain = step / 2 + mainBase
                        break
                    default:   // flex-start
                        currentMain = mainBase
                        step = 0
                        break;
                }

                for (let i = 0; i < flexLine.length; i++) {
                    let item = flexLine[i]
                    let itemStyle =item.style

                    itemStyle[mainStart] = currentMain
                    itemStyle[mainEnd] = itemStyle[mainStart] + itemStyle[mainSize] * mainSign
                    currentMain = itemStyle[mainEnd] + step
                }
            }

        })
    }


    // 计算cross 交叉轴位置
    // align-items, align-self
    if (!style[crossSize]) {
        crossSpace = 0
        elementStyle[crossSize] = 0
        for (let i = 0; i < flexLines.length; i++) {
            elementStyle[crossSize] += flexLines[i].crossSpace
        }
    } else {
        crossSpace = style[crossSize]
        // 前面的 crossSpace 都是占用空间，下面才是求真的剩余空间
        for (let i = 0; i < flexLines.length; i++) {
            crossSpace -= flexLines[i].crossSpace
        } 
    }

    if (style['flex-wrap'] === 'wrap-reverse') {
        crossBase = style[crossSize]
    } else {
        crossBase = 0
    }

    let step
    switch (style['align-content']) {
        case 'flex-start':
            crossBase += 0
            step = 0
            break
        case 'flex-end':
            crossBase += crossSign * crossSpace
            step = 0
            break
        case 'center':
            crossBase += crossSign * crossSpace / 2
            step = 0
            break
        case 'space-between':
            step = crossSpace / (flexLines.length - 1)
            crossBase += 0
            break
        case 'space-around':
            step = crossSpace / flexLines.length
            crossBase += crossSign * step / 2
            break
        default:
            step = 0
            crossBase += 0
            break
    }

    for (let i = 0 ; i < flexLines.length; i++) {
        let flexLine = flexLines[i]
        let lineCrossSize = style['align-content'] === 'stretch' ?
        flexLine.crossSpace + crossSpace / flexLines.length : flexLines.crossSpace


        for (let j = 0; j < flexLine.length; j++) {
            let item = flexLine[j]
            let itemStyle = item.style
            let align = itemStyle['align-self'] || style['align-items']


            
            if (itemStyle[crossSize] === null) {
                itemStyle[crossSize] = (align === 'stretch') ? lineCrossSize : 0
            }
            

            switch (style['align-items']) {
                case 'flex-start':
                    itemStyle[crossStart] = crossBase
                    itemStyle[crossEnd] = itemStyle[crossStart] + crossSign * itemStyle[crossSize]
                    break
                case 'flex-end':
                    itemStyle[crossEnd] = crossBase + crossSign * lineCrossSize
                    itemStyle[crossStart] = itemStyle[crossEnd] - crossSign * itemStyle[crossSize]
                    break
                case 'center':
                    itemStyle[crossStart] = crossBase + crossSign * (lineCrossSize - itemStyle[crossSize]) / 2
                    itemStyle[crossEnd] = itemStyle[crossStart] + crossSign * itemStyle[crossSize]
                    break
                case 'baseline':
                    // todo
                default: // stretch
                    itemStyle[crossStart] = crossBase
                    itemStyle[crossEnd] = itemStyle[crossStart] + crossSign * ((itemStyle[crossSize] !== null && itemStyle[crossSize] !== void 0) ? itemStyle[crossSize] : lineCrossSize)
                    itemStyle[crossSize] = crossSign * (itemStyle[crossEnd] - itemStyle[crossStart])
                    break
            }
        }
        crossBase += crossSign * (lineCrossSize + step)
    }
    
}


module.exports = {
    layout
}