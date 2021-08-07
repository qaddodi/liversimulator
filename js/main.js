//=============== CLASSES ====================

const visualCanvas = document.getElementById("visualization");
const visualContext = visualCanvas.getContext("2d");
visualCanvas.width = 400;
visualCanvas.height = 100;

var visualArray = [];

//=========================================== 
const canvas = document.getElementById("canvas");
const context = canvas.getContext("2d");

const graphCanvas = document.getElementById("graph");
const graphContext = graphCanvas.getContext("2d");
graphCanvas.width = 400;
graphCanvas.height = 250;
canvas.width = 400;
canvas.height = 250;

var chart;
var debug = false; 

// Handling dark and light modes
var darkColors = 
{
	dark:true,
	bg:"rgb(10,10,10)",
	text:"rgb(255,255,255",
	annotationLine:"rgb(200,200,200)",
	annotationText:"rgba(255,255,255,0.9)",
	chart:"rgb(255,255,255)",
	ALT:"rgb(200,200,200)",
	AST:"rgb(0,200,0)",
	ALP:"rgb(200,0,0)",
	Tbili:"rgb(200,200,0)",
	Dbili:"rgb(200,200,0)",
	inr:"rgb(200,0,200)",
	debug: "white",
	title: "white",
	subtitle: "rgb(200,200,200)"
}

var lightColors = 
{
	dark:false,
	bg:"rgb(245,235,230)",
	text:"rgb(10,10,10)",
	annotationLine:"rgb(10,10,10)",
	annotationText:"rgba(10,10,10,0.9)",
	chart:"rgb(10,10,10)",
	ALT:"rgb(100,100,100)",
	AST:"rgb(0,200,0)",
	ALP:"rgb(200,0,0)",
	Tbili:"rgb(150,150,0)",
	Dbili:"rgb(150,150,0)",
	inr:"rgb(200,0,200)",
	debug: "black",
	title: "black",
	subtitle: "rgb(100,100,100)"
}

var colors = lightColors;
document.getElementById("main").style.backgroundColor = colors.bg;
document.getElementsByClassName("title")[0].style.color=colors.title;
document.getElementsByClassName("subtitle")[0].style.color=colors.subtitle;

function toggleLights(){
	if(colors.dark){
		colors = lightColors;
	}else{
		colors = darkColors;
	}
	chart.destroy();
	initiateGraph();
	render();
	document.getElementById("main").style.backgroundColor = colors.bg;
	document.getElementsByClassName("title")[0].style.color = colors.title;
	document.getElementsByClassName("subtitle")[0].style.color=colors.subtitle;
}

// SIMULATION PARAMTERES ------
var fps = 30; //DONT CHANGE FPS OR EVERYTHING CHANGES
var simulationSpeed = 20;
var fpsInterval, startTime, now, then, elapsed;
var t = 0;
var frame = 0;
var stop = false;
var timer = 0;

// INITIATION OF ARRAYS =====
var altArray = [];
var astArray = [];
var biliArray = [];
var dBiliArray = [];
var alpArray = [];
var inrArray = [];
var annotations = [];

// EXTRA PARAMETERS FOR THE LIVER =====
var rFactor;
var barotrauma = 0;
var biliaryHepatopathy = 0;
var vitKAbsorbable = true;
var arterialFlow = 1;
var portalFlow = 1; //1 is hepatopetal, -1 is hepatofugal

var graphUpdateFrequency = 1; //graph update frequency per time unit (usually hr here)

var patient;
// LIVER VARIABLE INITIATION
var liver;
// LABS = actual numbers; MEASUREDLABS affected by B6 for example. always display measured on monitor
var labs;
var measuredLabs;
// EXTRA LABS
var dBili;
var indBili;
var glutathione; 
var vitK;
var coagulationFactors;
var vitB6;
var cpk;
var ldh;
var cu;

var cholestaticToxin;
var hepatocellularToxin;

var drugs = {
}

function reset(){
	liver = 
	{
		function: 1,
		integrity: 1,
		bileFlow: 1,
		cholestasis: 0,
		timeInjured: 0,
		timeObstructed:0,
		steatosis:0
	};
	labs = 
	{
		alt: 20,
		ast: 20,
		alp: 67,
		tbili: 1,
		inr: 1
	};

	measuredLabs = 
	{
		alt: 20,
		ast: 20,
		alp: 67,
		tbili: 1,
		inr: 1
	};

	drugs = {
		augmentin: 0
	}

	glutathione = 1; 
	vitK = 34.6;
	coagulationFactors = 1;
	vitB6 = 1;
	cpk = 40;
	ldh = 40;
	augmentin = 0;
	cu = 0;

	cholestaticToxin = 0;
	hepatocellularToxin = 0;
	resetGraph();
	resetPatient();
}

// HALF LIFE OF EVER COMPONENT NEEDED TO BE SIMULATED
var hl =
{
	alt: 47,
	ast: 17,
	alp: 168,
	tbili: 2,
	vitK: 24,
	cpk: 36,
	augmentin: 1.3
}

// PRODUCTION RATE USUALLY 0 BUT VITK IS 1 TO KEEP IT STEADY; THIS IS DYNAMICALLY CHANGED LATER
var production=
{
	alt: 0,
	ast: 0,
	alp: 0,
	tbili: 0,
	vitK: 1,
	cpk: 1
}


// FUNCTIONS TO SIMULATE DISEASE AND MEDICAL PROCESSES =======
function acuteViralHepatitis(){
	annotateGraph(t,"Viral Hep");
	liver.integrity = 0.5;
}

function acuteTylenolToxicity(){
	annotateGraph(t,"Tylenol");
	liver.integrity = 0.25;
	glutathione = 0.5;
}

function giveNAC(){
	annotateGraph(t,"NAC");
	glutathione = 1;
}

function rhabdomyolysis(){
	annotateGraph(t,"Rhabdo");
	cpk = 50000;
}

function giveVitK(){
	annotateGraph(t,"Vit K");
	production.vitK=1;
}

function acuteBiliaryObstruction(){
	annotateGraph(t,"Bile Obstr");
	liver.bileFlow = 0.6;
}

function resolveBiliaryObstruction(){
	annotateGraph(t,"ERCP/PTC");
	liver.bileFlow = 1;
}

function acuteAlcoholicHepatitis(){
	annotateGraph(t,"Alc Hep");
	liver.integrity = 0.9;
	vitB6 = 0;
}

function augmentinToxicity(){
	annotateGraph(t,"Augmentin");
	drugs.augmentin = 400;
}

function ischemicHepatitis(){
	annotateGraph(t,"Shock Liver");
	patient.sbp = 80;
	patient.dbp = 30;
	window.setTimeout(resetPatient,100);
}

function wilsonianHepatitis(){
	annotateGraph(t,"Wilsons");
	cu = 1;
	vitB6 = 0;
}

function chelateCopper(){
	annotateGraph(t,"Cu Chelation");
	cu = 0;
	vitB6 = 1;
}

function increaseBMI(){
	annotateGraph(t,"BMI 50");
	patient.bmi = 50;
	liver.integrity = 0.997;
}

function decreaseBMI(){
	annotateGraph(t,"BMI 20");
	patient.bmi = 20;
}

window.setInterval(nafld,4000);
function nafld(){
	if(liver.steatosis > 0.2){
		if(Math.random()<liver.steatosis){
			annotateGraph(t,"NASH");
			liver.integrity = 0.997;
		}
	}
}

// RESET FUNCTIONS
function resetPatient(){
	patient = 
	{
		sbp: 120,
		dbp: 80,
		map: 0,
		o2sat: 1,
		bmi: 20
	}
	map = (2/3)*patient.dbp + (1/3)*patient.sbp;
}

function toggleDebug(){
	if(debug){
		debug = false;
	}else{
		debug = true;
	}
}

// PAUSE AND UNPAUSE FUNCTIONALITY ======= YES NEED ALL THREE FUNCTIONS ======
var paused = false;
function pause(){
	stop == true ? stop = false:stop = true;
	paused = true;
}

function unpause(){
	stop == true ? stop = false: stop = true;
	start(fps);
	paused = false;
}

function togglePause(){
	if(paused){
		unpause();
	}else{
		pause();
	}
}
document.addEventListener("visibilitychange", function() {
    if (document.hidden){
        pause();
    } else {
        unpause();
    }
});

// SIMULATION SPEED BUTTONS
function increaseSimulationSpeed(){
	simulationSpeed += 5;
}

function decreaseSimulationSpeed(){
	if(simulationSpeed>5){
		simulationSpeed -= 5;
	}
}

// UPDATING PATINET PARAMETERS
function updatePatient(dt){
	patient.map = (2/3)*patient.dbp+(1/3)*patient.sbp;
}



// UPDATING THE LIVER VARIABLE AND ITS FUNCTION AND INTEGRITY HERE
function updateLiver(dt){
	var healingPower = glutathione;
	liver.steatosis = patient.bmi/100;

	if(cu>0.5){
		liver.integrity = 0.5;
	}

	if(patient.map<50){
		liver.integrity = 0.1;
	}
	if(patient.o2sat<0.7){
		liver.integrity = liver.integrity-(0.1*patient.o2sat);
	}

	//this will slowly improve the integrity of the liver until it's close to 100%
	//this depends on the healingPower of the liver
	// healingpower as above depends on glutathion among other factors (to be added)
	if(liver.integrity < 1){
		liver.integrity += dt*(healingPower-liver.integrity)/100;
	}

	if(liver.integrity > 0.999){
		liver.integrity = 1;
	}


	// this function will simulate the "barotrauma" that occurs as a result of rapid obstruction of the bile duct
	if(liver.bileFlow<1){
		var initialObstructionTime = 50;
		liver.timeObstructed+=dt;
		if(liver.timeObstructed<=initialObstructionTime){
			barotrauma = 100/(1+Math.pow(liver.timeObstructed-10,2));
		}
		if(liver.timeObstructed>initialObstructionTime){
			barotrauma = 0;
		}
	}

	//if the bileflow is back to normal, make sure no barotrauma or biliary hepatopathy is applied
	if(liver.bileFlow==1){
		liver.timeObstructed = 0;
		barotrauma=0;
		biliaryHepatopathy = 0;
	}

	//once the liver's integrity is < 70%, liver is considered "injured" 
	//injured time will start accumulating to calculate how much time it's been in this state
	//also injured time will slowly go back to 0 if liver integrity is > 70%
	if(liver.integrity<0.7){
		liver.timeInjured += dt;
	}else{
		if(liver.timeInjured>0){
			liver.timeInjured -= dt;
		}
	}
	//if the tbili is > 3, then biliary hepatopathy starts occuring slowly
	//this depends on the amount of Tbili
	if(dBili>3){
		biliaryHepatopathy = 25*labs.tbili/100;
	}

	liver.cholestasis = cholestaticToxin;
	liver.cholestasis *= 0.999*dt;

	// finally the liver function itself is dependant on its integrity and amount of time spent in injury
	liver.function = liver.integrity/Math.sqrt(0.01*liver.timeInjured+(liver.integrity*liver.integrity));
}

// UPDATING THE INDIVIDUAL LABS AND HALF LIVES ETC
function updateLabs(dt){

	//ALT and AST APPLIES BILIARY HEPATOPATHY AND TRAMA HERE
	production.alt = biliaryHepatopathy+barotrauma+0.3+(1-liver.integrity)*300;
	production.ast = biliaryHepatopathy+barotrauma+0.5+(1-liver.integrity)*400+0.01*cpk;

	//ALP and TBILI
	production.alp = 0.3+(1-liver.bileFlow)*10+(1-liver.integrity)*10+liver.cholestasis*10;
	production.alp *= (1.01-cu);

	production.tbili = 10*Math.exp(-liver.bileFlow*6)+liver.cholestasis*0.5;
	hl.tbili = 30/(liver.function*liver.function);

	// DIRECT + INDIRECT BILIRUBIN CALCULATIONS
	var percentDirect = (1.5*liver.function)/(liver.function+1);
	dBili = percentDirect*labs.tbili;
	indBili = labs.tbili - dBili;

	//PRODUCTION EQUATIONS, DONT CHANGE THIS
	labs.alt = labs.alt + dt*production.alt;
	labs.ast = labs.ast + dt*production.ast;
	labs.alp = labs.alp + dt*production.alp;
	labs.tbili = labs.tbili + dt*production.tbili;

	//HALF LIFE EQUATIONS, DONT CHANGE THIS EVER
	labs.alt = labs.alt*(Math.pow(0.5,dt/hl.alt));
	labs.ast = labs.ast*(Math.pow(0.5,dt/hl.ast));
	labs.alp = labs.alp*(Math.pow(0.5,dt/hl.alp));
	labs.tbili = labs.tbili*(Math.pow(0.5,dt/hl.tbili));

	//COAGULATION
	vitK = vitK + dt*production.vitK; // production of 1
	vitK = vitK*(Math.pow(0.5,dt/hl.vitK)); // with 24h hl this will lead to stable of 34.6 vitK

	coagulationFactors = 100*vitK*liver.function; //3460 with normal function and normal vitK
	if(coagulationFactors>3500){coagulationFactors=3500;};

	labs.inr = 3460/coagulationFactors;

	//EFFECTS OF DBILI ON VITK ABSORPTION
	if(dBili>5 && vitKAbsorbable){
		production.vitK = 0.5;
		vitKAbsorbable = false;
	}
	if(dBili<5){
		production.vitK = 1;
		vitKAbsorbable = true;
	}

	

	// MEASURED LABS
	measuredLabs.alt = labs.alt;
	measuredLabs.ast = labs.ast;
	measuredLabs.alp = labs.alp;
	measuredLabs.tbili = labs.tbili;
	measuredLabs.inr = labs.inr;

	// EFFECTS OF VIT B6 ON MEASUREMENT

	measuredLabs.alt = labs.alt*(Math.pow(2,-3*(1-vitB6)));
	measuredLabs.ast = labs.ast*(Math.pow(2,-1*(1-vitB6)));

	//CPK mechanics
	cpk = cpk + dt*production.cpk;
	cpk = cpk*(Math.pow(0.5,dt/hl.cpk));

	//R FACTOR
	rFactor = ((measuredLabs.alt/40)/(measuredLabs.alp/120)).toFixed(1);
}

function updateDrugs(dt){
	drugs.augmentin = drugs.augmentin*(Math.pow(0.5,dt/hl.augmentin));
	cholestaticToxin = drugs.augmentin + cu;
	hepatocellularToxin = cu;
}


// HANDLING ANNOTATIONS
function annotateGraph(x,string){
	x /= 24;
	var annotation = {};
	annotation.xMax = x;
	annotation.xMin = x;
	annotation.borderWidth = 1;
	annotation.drawTime = "afterDraw";
	annotation.borderDash = [2,2];
	annotation.label = {};
	annotation.label.rotation = 0;
	annotation.label.yAdjust = 0;
	annotation.label.backgroundColor = "rgba(50,0,0,0.3)";
	annotation.label.enabled = true;
	annotation.label.content = string;
	annotation.label.position = "start";
	annotation.label.font = {};
	annotation.label.font.style = "oblique";
	annotation.label.font.size = 10;
	annotation.borderColor = colors.annotationLine;
	annotation.label.color = colors.annotationText;
	annotations.push(annotation);
	chart.options.plugins.annotation.annotations = annotations;
}

function clearAnnotations(){
	annotations = [];
	chart.options.plugins.annotation.annotations = annotations;
	chart.destroy();
	initiateGraph();
}

// RESETING THE GRAPH 
function resetGraph(){
	t = 0;
	altArray = [];
	astArray = [];
	biliArray = [];
	alpArray = [];
	dBiliArray = [];
	inrArray = [];
	clearAnnotations();
	chart.destroy();
	initiateGraph();
}

var liverImg = new Image();
liverImg.src = "./img/liver.png";


//==========================UPDATE FUNCTIONS=================
// RENDERING AND UPDATING THE GRAPH CHART.JS V3
function initiateGraph(){
	for(var i = 0;i<annotations.length;i++){
		annotations[i].borderColor = colors.annotationLine;
		annotations[i].label.color = colors.annotationText;
	}
	const data = {
		datasets:[
		
		{
			label: 'AST',
			data: astArray,
			pointRadius: 0,
			lineTension: 0.5,
			fill: false,
			borderColor: colors.AST,
			borderWidth: 2,
			yAxisID: 'A'
		},
		{
			label: 'ALT',
			data: altArray,
			pointRadius: 0,
			fill: false,
			lineTension: 0.5,
			borderColor: colors.ALT,
			borderWidth: 2,
			yAxisID: 'A'
		},
		{
			label: 'ALP',
			data: alpArray,
			pointRadius: 0,
			lineTension: 0.5,
			fill: false,
			borderColor: colors.ALP,
			borderWidth: 2,
			yAxisID: 'A'

		},
		{
			label: 'TBili',
			data: biliArray,
			pointRadius: 0,
			lineTension: 0.5,
			borderColor: colors.Tbili,
			fill: false,
			borderWidth: 2,
			yAxisID: 'B'
		},
		// {
		// 	label: 'DBili',
		// 	data: dBiliArray,
		// 	pointRadius: 0,
		// 	lineTension: 0.5,
		// 	borderDash:[2,2],
		// 	borderColor: colors.Dbili,
		// 	fill: false,
		// 	borderWidth: 2,
		// 	yAxisID: 'B'
		// },
		{
			label: 'INR',
			data: inrArray,
			pointRadius: 0,
			lineTension: 0.5,
			// borderDash:[2,2],
			borderColor: colors.inr,
			fill: false,
			borderWidth: 2,
			yAxisID: 'B'
		}
	]};
	const chartAreaBorder = 
	{
		id: 'chartAreaBorder',
		beforeDraw(chart, args, options) {
		const {ctx, chartArea: {left, top, width, height}} = chart;
		ctx.save();
		ctx.strokeStyle = options.borderColor;
		ctx.lineWidth = options.borderWidth;
		ctx.setLineDash(options.borderDash || []);
		ctx.lineDashOffset = options.borderDashOffset;
		ctx.strokeRect(left, top, width, height);
		ctx.restore();
		}
	};
	chart = new Chart
	(graphContext, 
		{
			type: 'line',
			data: data,
			options: 
			{
				responsive: false,
				animation:false,
				scales:{
					A:
						{	
							position: 'left',
							grace: "15%",
							title:{
								display:true,
								text:"Liver Enzymes",
								color:colors.chart
							},
							suggestedMin: 0,
							suggestedMax: 100,
							grid:{display:false},
							ticks: {fontSize: 10,color:colors.chart}
						},
					B:
						{
							position:'right',
							grace: "15%",
							suggestedMin:0,
							suggestedMax:3,
							ticks: {fontSize: 10,color:colors.chart},
							grid:{display:false},
							title:{
								display:true,
								text:"Bilirubin/INR",
								color:colors.chart
							}
						},
					x:
						{
							display: true,
							grid:{display:false},
							type: "linear",
							// grace: "2%",
							beginAtZero: false,
							title:{
								display: true,
								text: "Days",
								color:colors.chart
							},
							suggestedMax: 500/24,
							ticks: 
							{
								maxRotation:0,
								minRotation:0,
								display: true,
								fontSize: 10,
								color:colors.chart,
								stepSize:2,
							}
						}
				},
				plugins:{
					legend:{
						display:true,
						position:"top",
						labels:{
							color:colors.chart,
							boxHeight:0,
							boxWidth:10
						}
					},
					chartAreaBorder:{
						borderColor:colors.chart,
						borderWidth:1
					}
				}
			},
			plugins: [chartAreaBorder]
		}
	);
	chart.options.plugins.annotation.annotations = annotations;
}

var visualizationSquareSpeed = 2;

//UPDATING THE GRAPH IS CALLED EVERY SET AMOUNT ABOVE
function updateGraph(dt){

	var maxPoints = 500;
	var x = parseFloat(t.toFixed(2));
	x = x/24;
	var alt = measuredLabs.alt;
	var ast = measuredLabs.ast;
	var bili = measuredLabs.tbili;
	var alp = measuredLabs.alp;
	var dbili = dBili;
	var inr = measuredLabs.inr;
	if(x*visualizationSquareSpeed==x*visualizationSquareSpeed.toFixed(0)){
		visualArray.push({
			t: x,
			slice: 10,
			alt:alt,
			ast:ast,
			alp:alp,
			tbili:bili
		})
		// renderVisualization();
	}
	

	alpArray.push({x,y: alp});
	altArray.push({x,y: alt}); 
	astArray.push({x,y: ast});
	biliArray.push({x,y: bili});
	dBiliArray.push({x,y: dbili});
	inrArray.push({x,y:inr});

	if(altArray.length>maxPoints){altArray.shift()};
	if(astArray.length>maxPoints){astArray.shift()};
	if(biliArray.length>maxPoints){biliArray.shift()};
	if(alpArray.length>maxPoints){alpArray.shift()};
	if(dBiliArray.length>maxPoints){dBiliArray.shift()};
	if(inrArray.length>maxPoints){inrArray.shift()};

	//REMOVE ANNOTATIONS ONCE OUT OF BOUNDS
	for(var i = 0;i<annotations.length;i++){
		if(annotations[i].xMin < altArray[0].x){
			annotations.splice(i,1);
		}
	}
	chart.update();
}

function renderVisualization(){
	visualArray.forEach(item =>{
		var color = {
			r: item.alp*255/1200,
			g: item.ast*255/7000,
			b: item.alt*255/7000
		}
		var style = "rgb(".concat(color.r.toString()).concat(",").concat(color.g.toString()).concat(",").concat(color.b.toString()).concat(")");
		item.style = style;
		visualContext.fillStyle = item.style;
		var x = item.t*item.slice%visualContext.canvas.width;
		var y = item.slice*Math.floor((item.t*item.slice)/visualContext.canvas.width);
		visualContext.fillRect(x,y,item.slice,item.slice);	
	})
}

// MAIN UPDATE FUNCTIONALITY THIS IS CALLED EVERY FRAME
function update(dt){
	updatePatient(dt);
	updateLabs(dt);
	updateDrugs(dt);
	updateLiver(dt);
}

//RENDERING =======
function renderPathology(){
}

// RENDERING THE MONITOR DISPLAYING ALT/AST AND LIVER PICTURE
function renderMonitor(){
	var indicatorHL = {
		alt: measuredLabs.alt < 5 ? "(L)" : measuredLabs.alt>40 ? "(H)" : "",
		ast: measuredLabs.ast < 5 ? "(L)" : measuredLabs.ast>40 ? "(H)" : "",
		alp: measuredLabs.alp < 35 ? "(L)" : measuredLabs.alp>130 ? "(H)" : "",
		tbili: measuredLabs.tbili < 0.1 ? "(L)" : measuredLabs.tbili>1.2 ? "(H)" : "",
		inr: measuredLabs.inr < 0.5 ? "(L)" : measuredLabs.inr>1 ? "(H)" : "",
		bmi: patient.bmi < 18 ? "(L)" : patient.bmi>24.9 ? "(H)" : ""

	}

	context.drawImage(liverImg,250,20,150,150);

	context.fillStyle=colors.text;
	context.font = '20px Courier';
	var decimals = 0;
	var y = 50;
	var x = 20;
	var vSpace = 20;
	context.fillStyle=colors.AST;
	context.fillText("AST: ".concat(measuredLabs.ast.toFixed(decimals).toString()).concat(indicatorHL.ast),x,y+vSpace*0);
	context.fillStyle=colors.ALT;
	context.fillText("ALT: ".concat(measuredLabs.alt.toFixed(decimals).toString()).concat(indicatorHL.alt),x,y+vSpace*1);
	context.fillStyle=colors.ALP;
	context.fillText("ALP: ".concat(measuredLabs.alp.toFixed(decimals).toString()).concat(indicatorHL.alp),x,y+vSpace*2);
	context.fillStyle=colors.Tbili;
	context.fillText("TBILI: ".concat(measuredLabs.tbili.toFixed(2).toString()).concat(indicatorHL.tbili),x,y+vSpace*3);
	context.fillStyle=colors.inr;
	context.fillText("INR: ".concat(measuredLabs.inr.toFixed(1).toString()).concat(indicatorHL.inr),x,y+vSpace*4);
	
	context.fillStyle=colors.text;
	context.fillText("BMI: ".concat(patient.bmi.toFixed(1).toString()).concat(indicatorHL.bmi),x,y+vSpace*5);
	// context.fillText("Integrity:".concat(100*liver.integrity.toFixed(2).toString()).concat("%"),x,y+vSpace*5);
	context.fillText("Function:".concat(100*liver.function.toFixed(2).toString()).concat("%"),x,y+vSpace*6);

	// context.fillText("Bile Flow:".concat(100*liver.bileFlow.toFixed(2).toString()).concat("%"),x,y+vSpace*7);
	context.fillText("Steatosis:".concat(100*liver.steatosis.toString()).concat("% "),x,y+vSpace*7);

	var rString = rFactor < 2 ? "Cholestatic" : rFactor > 5 ? "Hepatocellular" : "Mixed";
	context.fillText("R Factor:".concat(rFactor.toString()).concat(" ").concat(rString),x,y+vSpace*8);

}

// RENDER DEBUG
function renderDebug(){
	var monitor = document.getElementById("debug");
	monitor.style.visibility = "hidden";
	var monitorText = ""
	if(debug){
		monitor.style.visibility = "visible";
		monitorText += "<br style='red'> ALT: ".concat(measuredLabs.alt.toFixed(2).toString());
		monitorText += "<br> AST: ".concat(measuredLabs.ast.toFixed(2).toString());
		monitorText += "<br> ALP: ".concat(measuredLabs.alp.toFixed(2).toString());
		monitorText += "<br> Tbili: ".concat(measuredLabs.tbili.toFixed(2).toString());
		monitorText += "<br> ->dBili: ".concat(dBili.toFixed(2).toString());
		monitorText += "<br> INR: ".concat(measuredLabs.inr.toFixed(2).toString());
		monitorText += "<br>";
		monitorText += "<br> VitK: ".concat(vitK.toFixed(2).toString());
		monitorText += "<br> VitB6: ".concat(vitB6.toFixed(2).toString());
		monitorText += "<br> Glut: ".concat(glutathione.toFixed(2).toString());
		monitorText += "<br> CPK: ".concat(cpk.toFixed(2).toString());
	
		monitorText += "<br><br> Liver Variables";
		monitorText += "<br> Integrity: ".concat(liver.integrity.toFixed(2).toString());
		monitorText += "<br> Function: ".concat(liver.function.toFixed(2).toString());
		monitorText += "<br> CHD bile flow: ".concat(liver.bileFlow.toFixed(2).toString());
		monitorText += "<br> Time injured: ".concat(liver.timeInjured.toFixed(0).toString());
		monitorText += "<br> Time obstructed: ".concat(liver.timeObstructed.toFixed(0).toString());
		monitorText += "<br> Biliary hepatopathy: ".concat(biliaryHepatopathy.toFixed(0).toString());
	}
	monitor.innerHTML = monitorText.fontcolor(colors.debug);
}

// BACKGROUND OF CANVAS
function createBackgroundLayer(){
	context.fillStyle=colors.bg;
	context.fillRect(0,0,canvas.width,canvas.height);
}

// MAIN RENDER FUNCTION
function render(){
	createBackgroundLayer();
	renderMonitor();
	renderDebug();
	renderPathology();
}

// START FUNCTION
function start(fps){
	fpsInterval = 1000/fps;
	then = Date.now();
	startTime = then;
	loop();
}

//MAIN LOOP FUNCTIONALITY 
function loop(){
	if(stop){
		return;
	}
	requestAnimationFrame(loop);
	now = Date.now();
	elapsed = now-then;
	
	if(elapsed>fpsInterval){
		for(var i =0; i<simulationSpeed;i++){
			then = now - (elapsed%fpsInterval);
			frame++;
			t+=(fpsInterval/1000);
			// t = t%24; //change t to "days" instead of "hours"
			var dt = elapsed/1000;
			update(dt);
			render();
			if(frame%(fps*graphUpdateFrequency)==0){
				updateGraph(dt); // updating the graph every graphupdatfrequency above
			}
		}
		
		
	}
}

initiateGraph();
reset();
start(fps);

