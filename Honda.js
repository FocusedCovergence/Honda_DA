let data
let dataOrder
let rawData
let searchPool = []

let rawDataMaterial = []
let rawDataVendor = []
let rawDataShortText = []

let stepGraphNodePool = []

async function init() {
  data = await d3.json("Honda.json");
  dataOrder = await d3.json("data_order.json");
  rawData = await d3.json("rawData.json");
  console.log(data)
  showSlider(data);
  showSliderOrder();
  // generateNetwork();
  console.log("#" + "networkchart");
  generateLegend();

  // rawData.forEach(d => {
  //   searchPool.push(d["Material Group"].toString());
  //   rawDataMaterial.push(d["Material Group"].toString());

  //   searchPool.push( d["VendorNumber"].toString());
  //   rawDataVendor.push(d["Material Group"].toString());

  //   searchPool.push( d["Short Text"].toString());
  //   rawDataShortText.push( d["Short Text"].toString());
  // });
  // searchPool = Array.from(new Set(searchPool));
  // console.log(`This is 1 ${searchPool.length}`)


  rawDataMaterial = Array.from(new Set(rawData.map(d => d["Material Group"].toString())));
  rawDataVendor = Array.from(new Set(rawData.map(d => d["VendorNumber"].toString())));
  rawDataShortText = Array.from(new Set(rawData.map(d => d["Short Text"].toString())));

  const combinedUnique = new Set([...rawDataMaterial, ...rawDataVendor, ...rawDataShortText]);
  searchPool = Array.from(combinedUnique);

  // console.log(`This is 2 ${searchPool2.length}`)

  const rawDataSearch = document.getElementById('rawDataSearch');

  function handleSearchEvent() {
      var searchInput = rawDataSearch.value.toLowerCase();
      autoSuggest(searchInput, searchPool);
  }

  rawDataSearch.addEventListener('input', handleSearchEvent);
  rawDataSearch.addEventListener('click', handleSearchEvent);
}

init();

function drawNetwork(data,networkId) {
  const width = 1000;
  const height = 600;

  // Specify the color scale.
  const color = d3.scaleOrdinal(d3.schemeCategory10);

  // The force simulation mutates links and nodes, so create a copy
  // so that re-evaluating this cell produces the same result.
  const links = data.links.map(d => ({...d}));
  const nodes = data.nodes.map(d => ({...d}));
  // console.log(nodes);
  // console.log(links);

  const transformedLinks = links.map(link => ({
    source: link.material,
    target: link.vendor,
    value: link.value,
    type: link.type
  }));

  // Create a simulation with several forces.
  const simulation = d3.forceSimulation(nodes)
    .force("link", d3.forceLink(transformedLinks).id(d => d.id))
    .force("charge", d3.forceManyBody())
    .force("center", d3.forceCenter(1500 / 2, 1080 / 2))
    .on("tick", ticked);

  const zoom = d3.zoom()
    .scaleExtent([1/10, 5]) // This controls the zoom levels, adjust as needed
    .on("zoom", zoomed);
  

  const svg = d3.select("#" + networkId)
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", [0, 0, width, height])
    .call(zoom);
    // .attr("style", "max-width: 100%; height: auto;");

  const linkGroup = svg.append("g")
    .attr("class", "links")
    .attr("stroke", "#999")
    .attr("stroke-opacity", 0.8)
    .selectAll("line")
    .data(transformedLinks)
    .join("line")
      .attr("stroke", d => {
        if (d.type === 'ECPO'){
          return "green";
        } 
        else if (d.type === 'ECPT'){
          return "yellow";
        } 
        else {
          return "red";
        }
      })
    .attr("stroke-opacity", 0.8)
    .attr("stroke-width", d => Math.sqrt(d.value));

  const nodeGroup = svg.append("g")
    .attr("class", "nodes");

  nodes.forEach(d => {
    let node;
    if (d.type === "circle") {
      node = nodeGroup.append("circle")
        .attr("class", "visNodes")
        .attr("r", 5)
        .attr("fill", color(d.group));
    } else if (d.type === "square") {
      const sideLength = 10;
      node = nodeGroup.append("rect")
        .attr("class", "visNodes")
        .attr("width", sideLength)
        .attr("height", sideLength)
        .attr("fill", color(d.group))
        .attr("x", d.x - sideLength / 2)
        .attr("y", d.y - sideLength / 2);
    }
  
    node.attr("stroke", "#fff")
      .attr("stroke-width", 1.5)
      .datum(d) // Bind the data item to the node for access in event handlers
      .call(d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended))
      .append("title")
      .text(d => d.id)
    });

  // node.append("title")
  //     .text(d => d.id);

  // Add a drag behavior.
  // node.call(d3.drag()
  //       .on("start", dragstarted)
  //       .on("drag", dragged)
  //       .on("end", dragended));

  // Set the position attributes of links and nodes each time the simulation ticks.
  function ticked() {
    linkGroup
      .attr("x1", d => d.source.x)
      .attr("y1", d => d.source.y)
      .attr("x2", d => d.target.x)
      .attr("y2", d => d.target.y);

    nodeGroup.selectAll("circle")
      .attr("cx", d => d.x)
      .attr("cy", d => d.y);
  
    nodeGroup.selectAll("rect")
      .attr("x", d => d.x - 5) // Assuming square side length of 10 for example
      .attr("y", d => d.y - 5);
  }

  function zoomed({transform}) {
    svg.selectAll('g').attr("transform", transform);
  }
  
  svg.call(zoom.transform, d3.zoomIdentity.translate(100, 50).scale(0.5));

  // Reheat the simulation when drag starts, and fix the subject position.
  function dragstarted(event) {
    if (!event.active) simulation.alphaTarget(0.1).restart();
    event.subject.fx = event.subject.x;
    event.subject.fy = event.subject.y;
  }

  // Update the subject (dragged node) position during drag.
  function dragged(event) {
    event.subject.fx = event.x;
    event.subject.fy = event.y;
  }

  // Restore the target alpha so the simulation cools after dragging ends.
  // Unfix the subject position now that it’s no longer being dragged.
  function dragended(event) {
    if (!event.active) simulation.alphaTarget(0);
    event.subject.fx = null;
    event.subject.fy = null;
  }


  return svg.node();
};

function findMaxMinLink(data){
  const values = data.links.map(link => link.value);
  const maxValue = Math.max(...values);
  const minValue = Math.min(...values);
  return([minValue,maxValue])
}

function showSlider(data){
  const minmax = findMaxMinLink(data);
  const sliderContainer = document.getElementById("dualSlider");
  const rangeMessage = document.getElementById("rangeMessage");
  noUiSlider.create(sliderContainer, {
    start: [5, 10],
    connect: true,
    range: {
      'min': minmax[0],
      'max': minmax[1]
    },
    step: 1,
  });
  function updateRangeMessage(values) {
    const minVal = parseInt(values[0], 10);
    const maxVal = parseInt(values[1], 10);
    rangeMessage.textContent = `Number of Items Range: ${minVal} to ${maxVal} (included)`;
  }

  sliderContainer.noUiSlider.on('update', function (values) {
    updateRangeMessage(values);
  });

}

function showSliderOrder(){
  const minmax = findMaxMinLink(dataOrder);
  const sliderContainer = document.getElementById("dualSliderOrder");
  const rangeMessage = document.getElementById("OrderRangeMessage");
  noUiSlider.create(sliderContainer, {
    start: [5, 10],
    connect: true,
    range: {
      'min': minmax[0],
      'max': minmax[1]
    },
    step: 1,
  });
  function updateRangeMessage(values) {
    const minVal = parseInt(values[0], 10);
    const maxVal = parseInt(values[1], 10);
    rangeMessage.textContent = `Number of Orders Range: ${minVal} to ${maxVal} (included)`;
  }

  sliderContainer.noUiSlider.on('update', function (values) {
    updateRangeMessage(values);
  });

}

function generateNetwork(){
  const slider = document.getElementById('dualSlider').noUiSlider;
  const values = slider.get();
  
  const minimum = Math.round(values[0]);
  const maximum = Math.round(values[1]);

  const sliderOrder = document.getElementById('dualSliderOrder').noUiSlider;
  const valuesOrder = sliderOrder.get();
  
  const minimumOrder = Math.round(valuesOrder[0]);
  const maximumOrder = Math.round(valuesOrder[1]);

  var filteredData = filterData(data,minimum,maximum);



  var filterDataOrder = filterData(dataOrder,minimumOrder,maximumOrder);
  var networkID = "networkchart";
  var networkIDOrder = "networkchartOrder";
  updateChart(filteredData, networkID);

  //for order, not used
  // updateChart(filterDataOrder, networkIDOrder);

  nodeClickable();
}

// event listener on the button
var generateBtn = document.getElementById('generateNetworkBtn');
generateBtn.addEventListener('click', generateNetwork);


function filterData(data, minVal, maxVal) {
  const filteredLinks = data.links.filter(link => link.value >= minVal && link.value <= maxVal);

  const uniqueNodeIds = new Set(filteredLinks.flatMap(link => [link.material, link.vendor]));

  // Filter the nodes to include only those present in the filtered links
  const filteredNodes = data.nodes.filter(node => uniqueNodeIds.has(node.id));

  return {
    nodes: filteredNodes,
    links: filteredLinks
  };
}

function clearSvgContainer(networkid) {
  const svgContainer = document.getElementById(networkid);
  if (svgContainer) {
      svgContainer.innerHTML = '';
  }
}

function updateChart(data,networkid) {
  clearSvgContainer(networkid);
  // console.log(`Data for test: ${data}`);
  // console.log(data)
  drawNetwork(data,networkid); 

}
function generateLegend(){
  const numOfColors = 5;
  const colors = ["orange", "blue", "green", "yellow", "red"];
  const text = ["Vendor", "Material Group", "ECPO", "ECPT", "ECPO & ECPT"];
  const legendText = document.getElementById("legendText");
  const svg = d3.select("#legend")
    .attr("width", 1100)
    .attr("height", 50);
  const legendGroup = svg.append("g");
  for(let i = 0; i < numOfColors; i++){
    let rightOffset = 0;
    if(i != 1){
      rightOffset = i * 220 + 90;
      legendGroup.append("circle")
        .attr("r", 10)
        .attr("transform", `translate(${rightOffset},25)`)
        .attr("fill", colors[i]);
    }else{
      rightOffset = i * 220 + 90;
      legendGroup.append("rect")
        .attr("transform", `translate(${rightOffset},15)`)
        .attr("width", 20)
        .attr("height", 20)
        .attr("fill", colors[i])
    }
    currectText = document.createElement("div");
    currectText.setAttribute("class", "textContent")
    legendText.appendChild(currectText);
    currectText.innerHTML = text[i];
  }

}

function nodeClickable(){
  var allNodes = document.getElementsByClassName("visNodes");
  Array.from(allNodes).forEach(element => {
    element.addEventListener('click', function() {
        var strnodeNumber = this.innerHTML;
        var nodeNumber = strnodeNumber.slice(7,-8)
        const selectMessage = document.getElementById("showSelectMessage");
        var nodeLen = nodeNumber.length;
        var message = nodeLen == 10 ? `Current select: Vendor ${nodeNumber}` : `Current select: Material Group ${nodeNumber}`;
        selectMessage.innerHTML = message;

        const btnElement = document.getElementById("generateSankeyBtn");
        var btnMessage = nodeLen == 10 ? `Generate Sankey Diagram for: Vendor ${nodeNumber}` : `Generate Sankey Diagram for: Material Group ${nodeNumber}`;
        btnElement.innerHTML = btnMessage
    });
  });
}


var generateSankeyBtn = document.getElementById('generateSankeyBtn');
generateSankeyBtn.addEventListener('click', generateSankey);

function generateSankey(){
  var content = document.getElementById("generateSankeyBtn");
  var checkChar = content.innerHTML.slice(-10,-9);
  var selectNumber = 0;
  if (/^\d$/.test(checkChar)) {
    selectNumber = content.innerHTML.slice(-10)
  } else if(checkChar === 'p'){
    selectNumber = content.innerHTML.slice(-8)
  }else{
    selectNumber = -1;
  }
  console.log(selectNumber);
  let filteredData
  if(selectNumber != -1){
    var selectNumberToInt = parseInt(selectNumber, 10);
    if(selectNumber.length == 8){
      console.log("Material");
      filteredData = rawData.filter(d => d["Material Group"] === selectNumberToInt);
      generateByMaterial(filteredData,"sankeyDiaByPrice");
      generateByMaterial(filteredData,"sankeyDiaByItem");
    }else if(selectNumber.length == 10){
      filteredData = rawData.filter(d => d["VendorNumber"] === selectNumber);
      console.log(selectNumber)
      generateByVendor(filteredData,"sankeyDiaByPrice")
      generateByVendor(filteredData,"sankeyDiaByItem")
    }
  }else{
    alert("Warning: Vendor/Material not found!");
  }
}

function generateByMaterial(filterData,action){
  let nodes = [], links = [];
  let nodeMap = new Map();
  let linkMap = new Map();
  filterData.forEach(d => {
    let materialNode = {name: `Material: ${d["Material Group"]}`}
    let vendorNode = {name: `Vendor: ${d["VendorNumber"]}`};
    let textNode = {name: `ShortText: ${d["Short Text"]}`};

    if (!nodeMap.has(textNode.name)) {
      nodes.push(textNode);
      nodeMap.set(textNode.name, nodes.length - 1);
    }
    if (!nodeMap.has(vendorNode.name)) {
      nodes.push(vendorNode);
      nodeMap.set(vendorNode.name, nodes.length - 1);
    }
    if (!nodeMap.has(materialNode.name)) {
      nodes.push(materialNode);
      nodeMap.set(materialNode.name, nodes.length - 1);
    }
  });
  console.log(nodes);

  if(action === "sankeyDiaByPrice"){
    filterData.forEach(d => {
      let linkKey = `${d["VendorNumber"]}-${d["Short Text"]}`;
      let materialVendor = `${d["VendorNumber"]}-${d["Material Group"]}`;
      if (linkMap.has(linkKey)) {
        linkMap.get(linkKey).value += d['netPriceUnit'] * d['Order Quantity']; // Increment count for existing link
      } else {
        linkMap.set(linkKey, {
          source: `Vendor: ${d["VendorNumber"]}`,
          target: `ShortText: ${d["Short Text"]}`,
          value: d['netPriceUnit'] * d['Order Quantity']
        });
      }

      if (linkMap.has(materialVendor)) {
        linkMap.get(materialVendor).value += d['netPriceUnit'] * d['Order Quantity']; // Increment count for existing link
      } else {
        linkMap.set(materialVendor, {
          source: `Material: ${d["Material Group"]}`,
          target: `Vendor: ${d["VendorNumber"]}`,
          value: d['netPriceUnit'] * d['Order Quantity']
        });
      }
    });
  }else{
    filterData.forEach(d => {
      let linkKey = `${d["VendorNumber"]}-${d["Short Text"]}`;
      let materialVendor = `${d["VendorNumber"]}-${d["Material Group"]}`;
      if (linkMap.has(linkKey)) {
        linkMap.get(linkKey).value += 1;
      } else {
        linkMap.set(linkKey, {
          source: `Vendor: ${d["VendorNumber"]}`,
          target: `ShortText: ${d["Short Text"]}`,
          value: 1
        });
      }

      if (linkMap.has(materialVendor)) {
        linkMap.get(materialVendor).value += 1;
      } else {
        linkMap.set(materialVendor, {
          source: `Material: ${d["Material Group"]}`,
          target: `Vendor: ${d["VendorNumber"]}`,
          value: 1
        });
      }
    });
  }
  links = Array.from(linkMap.values());
  console.log(links)
  clearSvgContainer(action)
  drawSankeyDiagram(nodes,links,action);
}


function generateByVendor(filterData, action){
  let nodes = [], links = [];
  let nodeMap = new Map();
  let linkMap = new Map();

  filterData.forEach(d => {
    let materialNode = {name: `Material: ${d["Material Group"]}`};
    let vendorNode = {name: `Vendor: ${d["VendorNumber"]}`};
    let textNode = {name: `ShortText: ${d["Short Text"]}`};

    if (!nodeMap.has(textNode.name)) {
      nodes.push(textNode);
      nodeMap.set(textNode.name, nodes.length - 1);
    }
    if (!nodeMap.has(vendorNode.name)) {
      nodes.push(vendorNode);
      nodeMap.set(vendorNode.name, nodes.length - 1);
    }
    if (!nodeMap.has(materialNode.name)) {
      nodes.push(materialNode);
      nodeMap.set(materialNode.name, nodes.length - 1);
    }
  });
  console.log(nodes);

  if(action === "sankeyDiaByPrice"){
    filterData.forEach(d => {
      let linkKey = `${d["Material Group"]}-${d["Short Text"]}`; 
      let materialVendor = `${d["VendorNumber"]}-${d["Material Group"]}`;
      if (linkMap.has(linkKey)) {
        linkMap.get(linkKey).value += d['netPriceUnit'] * d['Order Quantity']; 
      } else {
        linkMap.set(linkKey, {
          source: `Material: ${d["Material Group"]}`,
          target: `ShortText: ${d["Short Text"]}`,
          value: d['netPriceUnit'] * d['Order Quantity']
        });
      }

      if (linkMap.has(materialVendor)) {
        linkMap.get(materialVendor).value += d['netPriceUnit'] * d['Order Quantity'];
      } else {
        linkMap.set(materialVendor, {
          source: `Vendor: ${d["VendorNumber"]}`,
          target: `Material: ${d["Material Group"]}`,
          value: d['netPriceUnit'] * d['Order Quantity']
        });
      }
    });
  }else{
    filterData.forEach(d => {
      let linkKey = `${d["Material Group"]}-${d["Short Text"]}`; 
      let materialVendor = `${d["VendorNumber"]}-${d["Material Group"]}`;
      if (linkMap.has(linkKey)) {
        linkMap.get(linkKey).value += 1;
      } else {
        linkMap.set(linkKey, {
          source: `Material: ${d["Material Group"]}`,
          target: `ShortText: ${d["Short Text"]}`,
          value: 1
        });
      }
  
      if (linkMap.has(materialVendor)) {
        linkMap.get(materialVendor).value += 1;
      } else {
        linkMap.set(materialVendor, {
          source: `Vendor: ${d["VendorNumber"]}`,
          target: `Material: ${d["Material Group"]}`,
          value: 1
        });
      }
    });
  }
  links = Array.from(linkMap.values());
  clearSvgContainer(action)
  drawSankeyDiagram(nodes,links,action);
}



function drawSankeyDiagram(nodes, links, action){
    // Specify the dimensions of the chart.
    console.log(links)
    console.log(action)
    const width = 928;
    const height = 600;
    const format = d3.format(",.0f");
  
    // Create a SVG container.
    const svg = d3.select("#" + action)
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", [0, 0, width, height])
        .attr("style", "max-width: 100%; height: auto; font: 10px sans-serif;");
    console.log(svg)
  
    // Constructs and configures a Sankey generator.
    const sankey = d3.sankey()
        .nodeId(d => d.name)
        .nodeAlign(d3.sankeyJustify)
        .nodeWidth(15)
        .nodePadding(10)
        .extent([[1, 5], [width - 1, height - 5]]);
  
    const {nodes: graphNodes, links: graphLinks} = sankey({
      nodes: nodes.map(d => Object.assign({}, d)),
      links: links.map(d => Object.assign({}, d))
    });
  
    // Defines a color scale.
    const color = d3.scaleOrdinal(d3.schemeCategory10);
  
    // Creates the rects that represent the nodes.
    svg.append("g")
      .selectAll("rect")
      .data(graphNodes)
      .enter().append("rect")
        .attr("x", d => d.x0)
        .attr("y", d => d.y0)
        .attr("height", d => d.y1 - d.y0)
        .attr("width", sankey.nodeWidth())
        .attr("fill", d => color(d.name))
      .append("title")
        .text(d => `${d.name}\n${format(d.value)}`);

    // Creates the links.
    svg.append("g")
      .attr("fill", "none")
      .attr("stroke-opacity", 0.5)
      .selectAll("path")
      .data(graphLinks)
      .enter().append("path")
        .attr("d", d3.sankeyLinkHorizontal())
        .attr("stroke", d => color(d.source.name))
        .attr("stroke-width", d => Math.max(1, d.width))
      .append("title")
        .text(d => `${d.source.name} : ${d.target.name}\n${format(d.value)}`);

    // Adds labels on the nodes.
    svg.append("g")
      .selectAll("text")
      .data(graphNodes)
      .enter().append("text")
        .attr("x", d => d.x0 < width / 2 ? d.x1 + 6 : d.x0 - 6)
        .attr("y", d => (d.y1 + d.y0) / 2)
        .attr("dy", "0.35em")
        .attr("text-anchor", d => d.x0 < width / 2 ? "start" : "end")
        .text(d => d.name); 
}

// document.addEventListener('DOMContentLoaded', function () {
//   var searchInput = document.getElementById('rawDataSearch').value.toLowerCase();
//   autoSuggest(searchInput);
// })

function autoSuggest(inputStr,searchPool){

  function matchRatio(inputStr, dataStr) {
    inputStr = inputStr.toLowerCase();
    dataStr = dataStr.toLowerCase();
    return dataStr.includes(inputStr);
  }

  let ratioMap = [];
  var suggestCount = 0;

  for (let i = 0; i < searchPool.length; i++) {
    let d = searchPool[i];
    var currentRatio = matchRatio(inputStr, d.toString());
    if (currentRatio) {
      suggestCount += 1;
      ratioMap.push(d);
      if(suggestCount >= 10) break;
    }
  }


  
  console.log(ratioMap);

  const suggestionsElement = document.getElementById('suggestions');
  suggestionsElement.innerHTML = '';
  suggestionsElement.style.display = "";
  if(inputStr.length > 0){
    ratioMap.forEach(suggestion => {
        const div = document.createElement('div');
        div.setAttribute("class", "suggestionContent")
        div.textContent = suggestion;
        div.addEventListener('click',function(){
          const searchInput = document.getElementById("rawDataSearch");
          searchInput.value = this.textContent;
          autoSuggest(searchInput.value,searchPool)
        })
        suggestionsElement.appendChild(div);
    });
  }
}

const searchInputBtn = document.getElementById("searchInputBtn");
searchInputBtn.addEventListener("click",function(){
  const suggestionsElement = document.getElementById('suggestions');
  const userInput = document.getElementById("rawDataSearch").value;
  if(!searchPool.includes(userInput)){
    alert("Vendor/Material/Item not found!");
  }else{
    clearSvgContainer("stepWalkChart")
    suggestionsElement.style.display = "none";
    if(rawDataMaterial.includes(userInput)){
      console.log("This is a MaterialGroup")
      generateSteps(userInput, "Material Group", "create")
    }else if(rawDataVendor.includes(userInput)){
      console.log("This is a Vendor")
      generateSteps(userInput, "VendorNumber", "create")
    }else{
      console.log("This is a short text")
      generateSteps(userInput, "Short Text", "create")
    }
  }
})

function generateSteps(userInput, category, action){
  const stepContainer = document.getElementById("stepContainer");
  stepContainer.style.display = ""
  const stepWalkChartContainer = document.getElementById("stepChartContainer")
  stepWalkChartContainer.style.display = ""

  const generateStepBtn = document.getElementById("generateNextStepBtn");
  generateStepBtn.style.display = ""

  if(action === "create"){
    //only create the first checkBox for first step
    stepContainer.innerHTML = ""
    var currentDataset = rawData.filter(d => d[category].toString() === userInput)
    stepGraphNodePool.push(currentDataset);
    console.log(`Current dataset when shortext ${currentDataset}`)

    if(category === "Short Text"){
      var materials = new Set(currentDataset.map(d => d["Material Group"].toString()));
      console.log(materials)
      // currentDataset = rawData.filter(d => d[category].toString().includes(materials));
      currentDataset = rawData.filter(d => materials.has(d["Material Group"].toString()));
      console.log(materials)

      var currentStep = document.createElement("div");
      currentStep.setAttribute("class", "checkboxContainer")
      stepContainer.appendChild(currentStep);

      
      var stepNum = document.createElement("p");
      stepNum.innerHTML = `Step 1: Material Group`
      stepNum.setAttribute("class", "stepNumber");
      currentStep.appendChild(stepNum);

      var checkBoxInnerContainer = document.createElement("div");
      checkBoxInnerContainer.setAttribute("class", "checkBoxInnerContainer");
      currentStep.appendChild(checkBoxInnerContainer);

      materials.forEach((userInput) => {
        var optionContainer = document.createElement("div");
        optionContainer.setAttribute("class", "options");
        checkBoxInnerContainer.appendChild(optionContainer);

        var checkBox = document.createElement("input");
        checkBox.type = "checkbox";
        checkBox.id = `${userInput}`;
        checkBox.name = userInput;
        // checkBox.checked = true;
        checkBox.className = "stepCheckBoxes"

        var label = document.createElement("label");
        label.htmlFor = checkBox.id;
        label.textContent = userInput;

        optionContainer.appendChild(checkBox);
        optionContainer.appendChild(label);
      })
      
    }else{

      var currentStep = document.createElement("div");
      currentStep.setAttribute("class", "checkboxContainer")
      stepContainer.appendChild(currentStep);

      var stepNum = document.createElement("p");
      stepNum.innerHTML = `Step 1: ${category}`
      stepNum.setAttribute("class", "stepNumber");
      currentStep.appendChild(stepNum);

      var checkBoxInnerContainer = document.createElement("div");
      checkBoxInnerContainer.setAttribute("class", "checkBoxInnerContainer");
      currentStep.appendChild(checkBoxInnerContainer);

      var optionContainer = document.createElement("div");
      optionContainer.setAttribute("class", "options");
      checkBoxInnerContainer.appendChild(optionContainer);

      var checkBox = document.createElement("input");
      checkBox.type = "checkbox";
      checkBox.id = `${userInput}`;
      checkBox.name = userInput;
      // checkBox.checked = true;
      checkBox.className = "stepCheckBoxes"

      var label = document.createElement("label");
      label.htmlFor = checkBox.id;
      label.textContent = userInput;

      optionContainer.appendChild(checkBox);
      optionContainer.appendChild(label);
    }

    //create the following step
    generateFirstStep(category, currentDataset, 1)
  }else{
    console.log("Not first");
    //create following steps
  
  }
}

function generateFirstStep(category, dataset, stepCount){
  let nextStep

  var currentStep = document.createElement("div");
  currentStep.setAttribute("class", "checkboxContainer")
  stepContainer.appendChild(currentStep);

  if(category === "VendorNumber"){
    nextStep = new Set(dataset.map(d => d["Material Group"].toString()));

    var stepNum = document.createElement("p");
    stepNum.innerHTML = `Step ${stepCount + 1}: Material Group`
    stepNum.setAttribute("class", "stepNumber");
    currentStep.appendChild(stepNum);

    var checkBoxInnerContainer = document.createElement("div");
    checkBoxInnerContainer.setAttribute("class", "checkBoxInnerContainer");
    currentStep.appendChild(checkBoxInnerContainer);

    nextStep.forEach((userInput) => {
      var optionContainer = document.createElement("div");
      optionContainer.setAttribute("class", "options");
      checkBoxInnerContainer.appendChild(optionContainer);

      var checkBox = document.createElement("input");
      checkBox.type = "checkbox";
      checkBox.id = `${stepCount + 1}-${userInput}`;
      checkBox.name = userInput;
      // checkBox.checked = true;
      checkBox.className = "stepCheckBoxes"

      var label = document.createElement("label");
      label.htmlFor = checkBox.id;
      label.textContent = userInput;

      optionContainer.appendChild(checkBox);
      optionContainer.appendChild(label);
    })
  }else{
    nextStep = new Set(dataset.map(d => d["VendorNumber"].toString()));
    
    var stepNum = document.createElement("p");
    stepNum.innerHTML = `Step ${stepCount + 1}: VendorNumber`
    stepNum.setAttribute("class", "stepNumber");
    currentStep.appendChild(stepNum);

    var checkBoxInnerContainer = document.createElement("div");
    checkBoxInnerContainer.setAttribute("class", "checkBoxInnerContainer");
    currentStep.appendChild(checkBoxInnerContainer);

    nextStep.forEach((userInput) => {
      var optionContainer = document.createElement("div");
      optionContainer.setAttribute("class", "options");
      checkBoxInnerContainer.appendChild(optionContainer);

      var checkBox = document.createElement("input");
      checkBox.type = "checkbox";
      checkBox.id = `${stepCount + 1}-${userInput}`;
      checkBox.name = userInput;
      // checkBox.checked = true;
      checkBox.className = "stepCheckBoxes"

      var label = document.createElement("label");
      label.htmlFor = checkBox.id;
      label.textContent = userInput;

      optionContainer.appendChild(checkBox);
      optionContainer.appendChild(label);
    })
  }
}

var generateNextStepBtn = document.getElementById('generateNextStepBtn');
generateNextStepBtn.addEventListener('click', function() {
  const checkBoxNumbers = document.querySelectorAll('.stepNumber');

  var currentStepNum = checkBoxNumbers.length;
  let nextType;
  let currentStep;
  if(checkBoxNumbers[currentStepNum-1].innerHTML.includes("Material")){
    nextType = "VendorNumber"
    currentStep = "Material Group"
  }else{
    nextType = "Material Group"
    currentStep = "VendorNumber"
  }
  console.log(nextType)
  const checkBoxContainers = document.querySelectorAll('.checkBoxInnerContainer');
  
  let allChecked = true;
  let checkedIdsInLastContainer = [];
  let checkedIdsInPreviousContainers = [];

  checkBoxContainers.forEach((container, index) => {
    const checkboxes = container.querySelectorAll('input[type="checkbox"]');
    
    const isChecked = Array.from(checkboxes).some(checkbox => checkbox.checked);
      
    if (!isChecked) {
      alert('Please check at least one box in each step before generating next step.');
      allChecked = false;
      return;
    }

    if (index < checkBoxContainers.length - 1) {
      checkedIdsInPreviousContainers.push(...Array.from(checkboxes)
        .filter(checkbox => checkbox.checked)
        .map(checkbox => checkbox.name));
    }else if (allChecked) {
      checkedIdsInLastContainer = Array.from(checkboxes)
        .filter(checkbox => checkbox.checked)
        .map(checkbox => checkbox.name);
    }
  });
  
  if (allChecked){
    console.log('All checks passed. Proceeding to the next step.');
    console.log(checkedIdsInLastContainer);
    console.log(checkedIdsInPreviousContainers);
    // generateNextStep(currentStepNum);

    let lastContainerAsString = checkedIdsInLastContainer.map(String);
    let previousContainersAsString = checkedIdsInPreviousContainers.map(String);

    const filteredLinks = data.links.filter(link => {
      const materialString = link.material.toString();
      const vendorString = link.vendor.toString();
      return (
        (lastContainerAsString.includes(materialString) || lastContainerAsString.includes(vendorString)) &&
        !previousContainersAsString.includes(materialString) && !previousContainersAsString.includes(vendorString)
      );
    })
    // console.log(filteredLinks)
    let nextStep
    if(lastContainerAsString[0].length == 8){
      // console.log(Array.from(new Set(filteredLinks.map(link => link.material.toString()))));
      nextStep = Array.from(new Set(filteredLinks.map(link => link.vendor.toString())))
    }else{
      // console.log(Array.from(new Set(filteredLinks.map(link => link.vendor.toString()))));
      nextStep = Array.from(new Set(filteredLinks.map(link => link.material.toString())))
    }

    console.log(checkedIdsInLastContainer[0].length)
    console.log(`This is the last container: ${checkedIdsInLastContainer}`)
    // console.log(Array.from(new Set(filteredLinks.map(link => link.vendor.toString()))));
    console.log(`Next step: ${nextStep}`)
    generateNextStep(nextStep, currentStepNum,nextType);
  }
});

function generateNextStep(nextStageArray, stepCount,nextType){
  // console.log(nextStageArray.length);
  // console.log(stepNum);
  if(nextStageArray.length != 0){
    var currentStep = document.createElement("div");
    currentStep.setAttribute("class", "checkboxContainer")
    stepContainer.appendChild(currentStep);

    var stepNum = document.createElement("p");
    stepNum.innerHTML = `Step ${stepCount + 1}: ${nextType}`
    stepNum.setAttribute("class", "stepNumber");
    currentStep.appendChild(stepNum);

    var checkBoxInnerContainer = document.createElement("div");
    checkBoxInnerContainer.setAttribute("class", "checkBoxInnerContainer");
    currentStep.appendChild(checkBoxInnerContainer);

    nextStageArray.forEach((userInput) => {
      var optionContainer = document.createElement("div");
      optionContainer.setAttribute("class", "options");
      checkBoxInnerContainer.appendChild(optionContainer);

      var checkBox = document.createElement("input");
      checkBox.type = "checkbox";
      checkBox.id = `${stepCount + 1}-${userInput}`;
      checkBox.name = userInput;
      // checkBox.checked = true;
      checkBox.className = "stepCheckBoxes"

      var label = document.createElement("label");
      label.htmlFor = checkBox.id;
      label.textContent = userInput;

      optionContainer.appendChild(checkBox);
      optionContainer.appendChild(label);
    })


  }else{
    alert("Warning: No More Path!");
  }
}


let selectedCheckboxIds = new Set();

function updateSelectionAndFilterData() {
  selectedCheckboxIds = new Set()
  document.querySelectorAll('.stepCheckBoxes').forEach(checkbox => {
    if (checkbox.checked) {
      selectedCheckboxIds.add(checkbox.name);
    } else {
      selectedCheckboxIds.delete(checkbox.name);
    }
  });

  const filteredNodes = data.nodes.filter(node => selectedCheckboxIds.has(node.id.toString()));
  const nodeIds = new Set(filteredNodes.map(node => node.id.toString()));
  const filteredLinks = data.links.filter(link => 
    nodeIds.has(link.material.toString()) || nodeIds.has(link.vendor.toString())
  );

  let allReferencedNodeIds = new Set([
    ...filteredLinks.map(link => link.material.toString()),
    ...filteredLinks.map(link => link.vendor.toString())
  ]);

  const missingNodeIds = [...allReferencedNodeIds].filter(id => !nodeIds.has(id));

  const missingNodes = data.nodes.filter(node => missingNodeIds.includes(node.id.toString()));

  const completeNodeSet = [...filteredNodes, ...missingNodes];

  return {
    nodes: completeNodeSet,
    links: filteredLinks
  };
}

document.addEventListener('DOMContentLoaded', () => {
  document.body.addEventListener('change', (event) => {
    if (event.target.classList.contains('stepCheckBoxes')) {
      console.log("Checkbox changed:", event.target.id);
      const filteredData = updateSelectionAndFilterData();
      console.log(filteredData);
      updateChart(filteredData, "stepWalkChart")
      nodeClickable()
    }
  });
});

document.getElementById("toggleButton").addEventListener("click", function() {
  var moreInfo = document.getElementById("moreInfo");
  if (moreInfo.style.display === "none") {
    moreInfo.style.display = "block";
    this.textContent = "Show Less";
  } else {
    moreInfo.style.display = "none";
    this.textContent = "Introduction";
  }
});




