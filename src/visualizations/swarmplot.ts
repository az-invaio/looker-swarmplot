import { Looker, VisualizationDefinition } from '../common/types';

import { handleErrors } from '../common/utils';

import * as d3 from 'd3';



declare var looker: Looker;
const AXIS_FONT_FAMILY = 'Arial'
let nGroups;
//BEGIN LOOKER VISUALIZATION SETUP

interface swarmplot extends VisualizationDefinition {
    
    elementRef?: HTMLDivElement,
}


const vis: swarmplot = {
    
    id: 'something', // id/label not required, but nice for testing and keeping manifests in sync
    
    label: 'Something',
    
    //OPTIONS
    options: {     
        //SETUP
        swarmType: {
            type: 'string', 
            label: 'Swarm Type',
            display: "select",
            values: [
                {"Cloud of Points (No overlapping)" : "cloud"},
                {'Exact Values (Allow overlapping)' : "exact"}
            ],
            // section: "  Setup",
            default: "cloud",
            order: 1
        },        
        
        //POINT OPTIONS     
        groupColors: {
            type: 'array',
            label: 'Colors',
            display: 'colors',
            // section: " Format Points",
            order: 2
        },

        dotRadius: {
            type: 'number' ,
            label: 'Dot Size',
            display: 'range',
            default: (11 - nGroups),
            min: 1, 
            max: 10, 
            step: 1,
            order: 3,
            // section: " Format Points"
        },

        //AXIS OPTIONS
        userSetMin:{
            type: 'number', 
            label: 'Value Axis Minimum',
            display: 'number',
            display_size: 'half',
            order: 4, 
            // section: "Axis Options"
        },

        userSetMax: {
            type: 'number',
            label: 'Value Axis Maximum',
            display:  'number',
            display_size: 'half',
            order: 5, 
            // section: "Axis Options"
        },

        userSetValueLabel: {
            type: 'string',
            label: 'Value Axis Label',
            order: 6
        },

        userSetGroupLabel: {
            type: 'string',
            label: 'Group Axis Label',
            order: 7
        }        

    },

    // Set up the initial state of the visualization
    create(element, config) {

        this.elementRef = element;
        element.innerHTML = `
            <style>
            .node,
            .link {
                transition: 0.5s opacity;
            }
            </style>`
        
        console.log(config.groupColors)    
        //add svg object
        this.svg = d3.select(element).append('svg')
            
        },
        
        // Render in response to the data or settings changing
        
    updateAsync(data, element, config, queryResponse) {
        let nGroups;
        //add tooltip
        var tooltip = d3.select(element).append('div')
            .attr('id', 'tooltip')
            .style('position', 'absolute')
            .style('opacity', 0)
            .style('background-color', '#121212')
            .style('border', 'solid')
            .style('border-color', '#121212')
            .style('color', 'white')
            .style('border-width', '1px')
            .style("border-radius", "5px")
            .style('box-shadow', '0px 0px 5px #333, inset 0px 0px 2px #333')
            .style("padding", "10px")
        
        console.log( 'data', data );
        // console.log( 'element', element );
        console.log( 'config', config );
        console.log( 'queryResponse', queryResponse );
        
        const errors = handleErrors(this, queryResponse, {

            // min_pivots: 0,

            // max_pivots: 0,

            min_dimensions: 2

            // max_dimensions: 1,

            // min_measures: 1,

            // max_measures: 1

        });

        if (errors) { // errors === true means no errors
            
        //SETUP OF VISUALIZATION 

            //update graphic dimensions
            var graphicHeight =  element.clientHeight
            var graphicWidth = element.clientWidth

            //update svg object
            const svg = this.svg
                .html('')
                .attr('width', '100%')
                .attr('height', '100%')
                .append('g')
                

            console.log('Dimensions:  (', graphicWidth, ' , ', graphicHeight, ')')
            

            //FUNCTIONS
            //interaction functions
            const dotMouseOver = function(d, i){
                d3.select(this).transition()
                    .attr('r', function(){return d.target.r.baseVal.value + 2})
                    .attr('stroke-width', 2)
                   
                let correctKey;
                if (i[valueKey]['rendered']===undefined) {correctKey = 'value'} else {correctKey='rendered'}

                var tooltip_text = ` ${idColLabel} : ${i[idKey]['value']}` + "<br/>" + 
                `${groupColLabel} : ${i[groupKey]['value']}` + "<br/>" + 
                `${valueColLabel} : ${ i[valueKey][correctKey]}`
                

                tooltip.html(tooltip_text)
                tooltip
                    .style("opacity", 1)
                    .style("left", (d.pageX + 10)+'px')
                    .style("top", (d.pageY + 10)+'px')
            }

            const dotMouseMove = function(d, i){
                
                d3.select(this).transition()
                    .attr('r', function(){return d.target.r.baseVal.value + 2})
                    .attr('stroke-width', 2)

                let correctKey;
                if (i[valueKey]['rendered']===undefined) {correctKey = 'value'} else {correctKey='rendered'}

                var tooltip_text = ` ${idColLabel} : ${i[idKey]['value']}` + "<br/>" + 
                `${groupColLabel} : ${i[groupKey]['value']}` + "<br/>" + 
                `${valueColLabel} : ${ i[valueKey][correctKey]}`
                

                tooltip.html(tooltip_text)
                tooltip
                    .style("opacity", 1)
                    .style("left", (d.pageX + 10)+'px')
                    .style("top", (d.pageY + 10)+'px')
            }
            
            const dotMouseOut = function(d, i){
                d3.select(this).transition()
                    .attr('r', config.dotRadius)
                    .attr('stroke-width', 1)

                tooltip
                    .style('opacity', 0)

            }

        //COLUMN READING AND SETUP

            //get columns and column order 
            var idColumn = queryResponse.fields.dimensions[0]
            var idKey = idColumn.name
            var idColLabel = idColumn.label_short

            
            //by default, group column is second column
            var groupColumn = queryResponse.fields.dimensions[1]
            var groupKey = groupColumn.name
            var groupColLabel = groupColumn.label_short     
            
            //by default, color grouping column is third column
            let colorColumn, colorKey, colorColLabel
            if (queryResponse.fields.dimensions.length > 2){
                colorColumn = queryResponse.fields.dimensions[2]
                colorKey = colorColumn.name
                colorColLabel = colorColumn.label_short
            } else {
                colorColumn = queryResponse.fields.dimensions[1]
                colorKey = colorColumn.name
                colorColLabel = colorColumn.label_short  
            }

            //by default, value column is fourth column (may be measure)
            let valueColumn 
            let valueKey 
            let valueColLabel 
            if (queryResponse.fields.measures.length>0){
                valueColumn = queryResponse.fields.measures[0]
                valueKey = valueColumn.name 
                valueColLabel = valueColumn.label_short
            } else{
                valueColumn = queryResponse.fields.dimensions[3]
                valueKey = valueColumn.name
                valueColLabel = valueColumn.label_short
            }

            console.log(`ID: ${idColLabel}, Group:${groupColLabel}, Color: ${colorKey}, Value:${valueColLabel}`)

            //get groups list
            var groups = []
            data.forEach(d=> {
                if (groups.includes(d[groupKey]['value'])) {return}
                else {groups.push(d[groupKey]['value'])}
            });

            console.log(groups)


            //set margins depending on number of groups
            nGroups = groups.length; 
            const graphPx = nGroups * 100 //arbitrary value for spacing
            var MARGINS = {TOP:(.05*graphicHeight) ,
                             LEFT: (.05*graphicWidth),
                             RIGHT: (.05*graphicWidth), 
                             BOTTOM:(.1*graphicHeight)}
              
            console.log(MARGINS)    

            //get min and max values for axis
            var allValues = Array.from(data, d=>d[valueKey]['value'])
            console.log(`${config.userSetMin},  ${config.userSetMax}`)
            var valueMin = Math.min(...allValues)
            var valueMax = Math.max(...allValues)
            var range = valueMax - valueMin
            var spacer = range*.1

            let axisMin, axisMax;
            
            //use either user-set min or calculate min from values
            if (config.userSetMin !== undefined && config.userSetMin !== null){
                axisMin = config.userSetMin;
            } else {
                axisMin = valueMin - spacer;
            }
            //use either user-set maax or calculate max from values
            if (config.userSetMax !== undefined && config.userSetMax !== null){
                axisMax = config.userSetMax;
            } else {
                axisMax = valueMax + spacer
            }

            //check validity of values, if not switch
            if (axisMin > axisMax){
                var tmp = axisMin;
                axisMin = axisMax;
                axisMin = tmp;
            }


            console.log(`Min: ${axisMin},   Max: ${axisMax}`)


            //SET UP COLOR GROUPS            
            //get color groups
            var cGroups = []
            data.forEach(d=>{
                if (cGroups.includes((d[colorKey]['value']))){}
                else {cGroups.push((d[colorKey]['value']))}
                                
            });

            //map colors to groups
            var colorMap = {}

            console.log(config.groupColors)

            let palette;
            if ((config.groupColors===undefined)||(config.groupColors.length < nGroups)){palette = d3.schemeCategory10}
            else {palette=config.groupColors}

            cGroups.forEach(g=>{
                colorMap[g] = palette[cGroups.indexOf(g)]
            })

            console.log(colorMap)

            data.forEach(d=>{
                var group = d[groupKey]['value']
                d['group'] = group
                d['color'] = colorMap[d[colorKey]['value']]
            });


            //add axis value axis
            var verticalShift = graphicHeight - MARGINS.BOTTOM
            var horizontalShift = 1.25*MARGINS.LEFT 

            var valScale = d3.scaleLinear()
                            .range([verticalShift, MARGINS.TOP])
                            .domain([axisMin, axisMax])

            var valAxis = d3.axisLeft()
                            .scale(valScale)
            
            var groupScale = d3.scaleBand()
                            .range([1.25*MARGINS.LEFT, (graphicWidth-MARGINS.LEFT-MARGINS.RIGHT)])
                            .domain(groups)
                            .padding(.1);
            
            var groupAxis = d3.axisBottom()
                            .scale(groupScale)


            svg.append('g')
                .attr('transform', `translate(${horizontalShift}, 0 )`)
                .call(valAxis)
                
            const bandwidth = 2*(graphicWidth-MARGINS.LEFT - MARGINS.RIGHT)/(nGroups)/3
            console.log()
            svg.append('g')
                .attr('transform', `translate(0, ${verticalShift} )`)
                .call(groupAxis)
                .selectAll('.tick text')
                .call(wrap, bandwidth)
   

            //LABEL AXES
            //function to wrap text on axes
            function wrap(text, width) {
                text.each(function() {
                    var text = d3.select(this),
                        words = text.text().split(/\s+/).reverse(),
                        word,
                        line = [],
                        lineNumber = 0,
                        lineHeight = 1.1, // ems
                        y = text.attr("y"),
                        dy = parseFloat(text.attr("dy")),
                        tspan = text.text(null).append("tspan").attr("x", 0).attr("y", y).attr("dy", dy + "em")
                    while (word = words.pop()) {
                    line.push(word)
                    tspan.text(line.join(" "))
                    if (tspan.node().getComputedTextLength() > width) {
                        line.pop()
                        tspan.text(line.join(" "))
                        line = [word]
                        tspan = text.append("tspan").attr("x", 0).attr("y", y).attr("dy", `${++lineNumber * lineHeight + dy}em`).text(word)
                    }
                    }
                })
            }

            let groupAxisLabel, valueAxisLabel;
            if (config.userSetValueLabel===undefined || config.userSetValueLabel===""){valueAxisLabel = valueColLabel} else {valueAxisLabel = config.userSetValueLabel}
            if (config.userSetGroupLabel===undefined || config.userSetGroupLabel===""){groupAxisLabel = groupColLabel} else {groupAxisLabel = config.userSetGroupLabel}
            
            console.log(config.userSetValueLabel)
            console.log(valueAxisLabel)

            //group axis  (assume x for now)
            svg.append('text')
                .attr('x', graphicWidth/2)
                .attr('y', graphicHeight )
                .style('font-family', AXIS_FONT_FAMILY)
                .style('font-size', '14px')
                .style('font-weight', 'bold')
                .style("text-anchor", "middle")
                .text(groupAxisLabel)

            //value axis (assume y for now)
            svg.append('text')
                .attr('x', -(graphicHeight-MARGINS.BOTTOM)/2)
                .attr('y', MARGINS.LEFT/3)
                .style('font-family', AXIS_FONT_FAMILY)
                .style('font-size', '14px')
                .style('font-weight', 'bold')
                .style("text-anchor", "middle")
                .attr("transform", "rotate(-90)")
                .text(valueAxisLabel)


            //GRAPH EACH GROUP OF DOTS
            groups.forEach(g =>{
                function groupCheck(dot) {
                    return dot[groupKey]['value']===g
                }

                var groupDots = data.filter(groupCheck)

                //GRAPH CLOUD STYLE
                if (config.swarmType === 'cloud'){  
                    var simulation = d3.forceSimulation(groupDots)
                        .force('collide', d3.forceCollide().radius(config.dotRadius).strength(2.5))
                        .force('y', d3.forceY(function(d){return valScale(d[valueKey]['value'])}).strength(3))
                        .force('x', d3.forceX(function(d){return groupScale(d[groupKey]['value'])}))
                        .stop();
        
                    for (var i = 0; i < 300; ++i) simulation.tick();
                    
                    svg.append('g').selectAll('dot')
                        .data(groupDots)
                        .enter().append('circle')
                        .attr('class', 'dot')
                        //circle specs
                        .attr('r', config.dotRadius)
                        .attr('cx', function(d){return d['x']+MARGINS.LEFT})
                        .attr('cy', function(d){return d['y']})
                        //circle styling
                        .style('fill', function(d){return d['color']})
                        .style('stroke', 'black')
                        .style('fill-opacity', .9)

                        //interactions
                        .on('mouseover', dotMouseOver)
                        .on('mouseleave', dotMouseOut)
                        .on('mousemove', dotMouseMove)

                }
                
                else if (config.swarmType == 'exact') {
                    var simulation = d3.forceSimulation(groupDots)
                        .force('collide', d3.forceCollide().radius(config.dotRadius-2).strength(30))
                        .force('y', d3.forceY(function(d){return valScale(d[valueKey]['value'])}).strength(3))
                        .force('x', d3.forceX(function(d){return groupScale(d[groupKey]['value'])+MARGINS.LEFT}).strength(4))
                        .stop();
        
                    for (var i = 0; i < 100; ++i) simulation.tick();

                    // var valuesDict = {}
                    // groupDots.forEach(d=>{
                    //     if (Object.keys(valuesDict).includes((Math.round(d[valueKey]['value'])).toString())) {
                    //         valuesDict[Math.round(d[valueKey]['value'])] +=1
                    //     } else {
                    //         valuesDict[Math.round(d[valueKey]['value'])] = 1
                    //     }
                    // })

                    // groupDots.forEach(d=>{
                    //     var nPoints = valuesDict[(Math.round(d[valueKey]['value'])).toString()]
                    //     if (nPoints = 1){d['x-adjusted'] = groupScale(d[groupKey]['value'])}
                    //     else {d['x-adjusted'] = d['x']}
                    // })
                    
                    svg.append('g').selectAll('dot')
                        .data(groupDots)
                        .enter().append('circle')
                        .attr('class', 'dot')
                        //circle specs
                        .attr('r', config.dotRadius)
                        .attr('cx', function(d){return d['x']})
                        .attr('cy', function(d){return valScale(d[valueKey]['value'])})
                        //circle styling
                        .style('fill', function(d){return d['color']})
                        .style('stroke', '#383838')
                        .style('opacity', .8)

                        //interactions
                        .on('mouseover', dotMouseOver)
                        .on('mouseleave', dotMouseOut)
                        .on('mousemove', dotMouseMove)

                    
                }
            
            })            

        };

    }, 


};


looker.plugins.visualizations.add(vis);