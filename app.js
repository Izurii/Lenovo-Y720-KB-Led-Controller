'use strict';

var angular = require('angular');
require('angular-route');
require('angular-material');
const { ipcRenderer } = require('electron');
const { SegmentBrightness, BacklightMode } = require('./driver/options');

const Colors = [
	{
		colorHex: '#E51012',
		colorName: 'Red'},
	{
		colorHex: '#FD0154',
		colorName: 'Torch Red'},
	{
		colorHex: '#FF00AA',
		colorName: 'Hollywood Cerise'},
	{
		colorHex: '#FF00FE',
		colorName: 'Magenta'},
	{
		colorHex: '#AA00FF',
		colorName: 'Electric Violet'},
	{
		colorHex: '#5500FE',
		colorName: 'Electric Violet 2'},
	{
		colorHex: '#5500FE',
		colorName: 'Blue'},
	{
		colorHex: '#0055FE',
		colorName: 'Blue Ribbon'},
	{
		colorHex: '#00AAFF',
		colorName: 'Azure Radiance'},
	{
		colorHex: '#00FFFF',
		colorName: 'Cyan'},
	{
		colorHex: '#00FFAB',
		colorName: 'Spring Green'},
	{
		colorHex: '#00FF55',
		colorName: 'Spring Green 2'},
	{
		colorHex: '#01FF00',
		colorName: 'Green'},
	{
		colorHex: '#55FF00',
		colorName: 'Bright Green'},
	{
		colorHex: '#AAFF01',
		colorName: 'Lime'},
	{
		colorHex: '#FFFF00',
		colorName: 'Yellow'},
	{
		colorHex: '#FFAA01',
		colorName: 'Web Orange'},
	{
		colorHex: '#FF5306',
		colorName: 'International Orange'},
	{
		colorHex: '#FFFFFF',
		colorName: 'White'},
	{
		colorHex: '#000000',
		colorName: 'Black'
	},
];

var app = angular.module('app', ['ngRoute', 'ngAnimate', 'ngMaterial']);

app.filter('htmlTrusted', ['$sce', function($sce){
	return function(text){ return $sce.trustAsHtml(text); };
}])
.controller('indexController', function ($scope, $sce) {
	
	$scope.brightness = SegmentBrightness;
	$scope.colors = Colors;
	$scope.blMode = BacklightMode;

	$scope.keyboard = [];
	$scope.numpad = [];

	let keys = [
		['35px', '35px', '35px', '35px', '35px', '35px', '35px', '35px', '35px', '35px', '35px', '35px', '35px', '35px'],
		['34.27px', '34.27px', '34.27px', '34.27px', '34.27px', '34.27px', '34.27px', '34.27px', '34.27px', '34.27px', '34.27px', '34.27px', '34.27px', '45px'], // diff 0.7px => 30px => 29.3px
		['45px', '34.27px', '34.27px', '34.27px', '34.27px', '34.27px', '34.27px', '34.27px', '34.27px', '34.27px', '34.27px', '34.27px', '34.27px', '34.27px'], // diff 0.7px => 30px => 29.3px
		['62px', '34.5px', '34.5px', '34.5px', '34.5px', '34.5px', '34.5px', '34.5px', '34.5px', '34.5px', '34.5px', '34.5px', '55px'], // diff 3.3px => 30px => 29.43px
		['54px', '35.7px', '35.7px', '35.7px', '35.7px', '35.7px', '35.7px', '35.7px', '35.7px', '35.7px', '35.7px', '92px'], // diff 0.15 => 30px => 29.85px
		['45px', '40.5px', '40.5px', '40.5px', '193px', '40.5px', '40.5px', '40.5px', '40.5px']
	];

	let keys_numpad = [
		['30px', '30px', '30px', '30px'],
		['30px', '30px', '30px', '30px'],
		['30px', '30px', '30px', '30px'],
		['30px', '30px', '30px', '30px'],
		['41px'],
		['41px', '41px', '41px']
	];

	keys_numpad.forEach(i => $scope.numpad.push(Object.assign({}, i)));
	keys.forEach(i => $scope.keyboard.push(Object.assign({}, i)));

	$scope.segmentsOptions = [
		{ segmentColor: 0, segmentBrightness : $scope.brightness.HIGH },
		{ segmentColor: 0, segmentBrightness : $scope.brightness.HIGH },
		{ segmentColor: 0, segmentBrightness : $scope.brightness.HIGH },
		{ segmentColor: 0, segmentBrightness : $scope.brightness.HIGH }
	];

	$scope.selectedSegment = 0;
	$scope.selectedBrightness = 3;
	$scope.backlightMode = 3;

	$scope.advancedBrightness = false;

	$scope.selectSegmentColor = (index) => {
		$scope.segmentsOptions[$scope.selectedSegment] = { 
			...$scope.segmentsOptions[$scope.selectedSegment],
			segmentColor: index
		};
		$scope.applySettings();
	};

	$scope.checkSelectedSegmentColor = (index) => {
		if($scope.segmentsOptions[$scope.selectedSegment]!=undefined)
			if($scope.segmentsOptions[$scope.selectedSegment].segmentColor==index)
				return true;
	};

	$scope.backlightModeIcons = [
		'./assets/heartbeat.jpg',
		'./assets/breath.jpg',
		'./assets/smooth.jpg',
		'./assets/always_on.jpg',
		'./assets/wave.jpg',
	];

	$scope.getModeIcon = (index) => {

		let iconButton = `
			<img
				class="mode-icon"
				src="${$scope.backlightModeIcons[index]}"
				${(index==$scope.backlightMode) ? 'style="border: 3px solid #FFFFFF">' : 
			'>'}`;

		return $sce.trustAsHtml(iconButton);
	};

	$scope.changeBacklightMode = (index) => { 
		$scope.backlightMode = index;
		$scope.applySettings();
	};

	const getKeyRow = (keyRow, keyIndex, kOrN) => {
		if(kOrN=='k') {
			if(keyIndex < 4) keyRow = 0;
			if(keyIndex >= 4 && keyIndex < 9) { if((keyRow!=5) || (keyRow==5&&keyIndex==4)) keyRow = 1; else keyRow=2; };
			if(keyIndex >= 9 && keyIndex < 14) keyRow = 2;
		} else if (kOrN=='n')
			keyRow = 3;
		return keyRow;
	};

	$scope.selectSegment = (keyRow, keyIndex, kOrN) => { let idx = getKeyRow(keyRow, keyIndex, kOrN); $scope.selectedSegment = idx; };
	$scope.getKey = (keyWidth, keyRow, keyIndex, kOrN) => {
		
		var boxShadowInner;
		let colorOption = '#000000'

		keyRow = getKeyRow(keyRow, keyIndex, kOrN)
		
		if($scope.segmentsOptions[keyRow].segmentColor!=undefined)
			colorOption = Colors[$scope.segmentsOptions[keyRow].segmentColor].colorHex;

		if(keyRow==$scope.selectedSegment) boxShadowInner = 'inset 0 0 8px #ffffff';

		var boxShadow = `box-shadow: ${boxShadowInner} ${($scope.segmentsOptions[keyRow].segmentColor!=19&&boxShadowInner) ? ', ' : ''} ${($scope.segmentsOptions[keyRow].segmentColor!=19) ? `0 0 ${$scope.segmentsOptions[keyRow].segmentBrightness * 2.3}px ${$scope.segmentsOptions[keyRow].segmentBrightness / 1.6}px ${colorOption}` : ''}`;

		return $sce.trustAsHtml(`<span
			class="keys not-selectable"
			style=
			"
				width:${keyWidth} !important;
				border: 2px solid ${colorOption};
				${boxShadow};
			"
			>
		</span>`);
	};

	$scope.showHideAdvancedBrightnessOptions = () => {
		if($scope.advancedBrightness) $scope.advancedBrightness = false;
		else $scope.advancedBrightness = true;
	};

	$scope.changeAllSegmentBrightness = () => {
		$scope.segmentsOptions.forEach((item, idx) => {
			$scope.segmentsOptions[idx].segmentBrightness = $scope.selectedBrightness;
		});
		ipcRenderer.send('setKB', $scope.backlightMode, $scope.segmentsOptions);
	};

	$scope.applySettings = () => {
		ipcRenderer.send('setKB', $scope.backlightMode, $scope.segmentsOptions);
;	}

});