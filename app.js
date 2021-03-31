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
	$scope.segmentsOptions = [];
	$scope.selectedSegment = 0;

	$scope.selectSegmentColor = ($index) => $scope.segmentsOptions[$scope.selectedSegment] = { 
		...$scope.segmentsOptions[$scope.selectedSegment],
		segmentColor: $index
	};

	$scope.checkSelectedSegmentColor = ($index) => {
		if($scope.segmentsOptions[$scope.selectedSegment]!=undefined)
			if($scope.segmentsOptions[$scope.selectedSegment].segmentColor==$index)
				return true;
	};

	$scope.apply = () => {
		ipcRenderer.send('setKB', $scope.segmentsOptions);
	};

	$scope.getKey = (keyWidth, keyRow, keyIndex, kOrn) => {

		let colorOption = '#000000'

		if(kOrn=='k') {
			if(keyIndex < 4) keyRow = 0;
			if(keyIndex >= 4 && keyIndex < 8) { if((keyRow!=5) || (keyRow==5&&keyIndex==4)) keyRow = 1; else keyRow=2; };
			if(keyIndex >= 8 && keyIndex < 14) keyRow = 2;
		} else if (kOrn=='n')
			keyRow = 3;

		if($scope.segmentsOptions[keyRow]!=undefined)
			colorOption = Colors[$scope.segmentsOptions[keyRow].segmentColor].colorHex;
		return $sce.trustAsHtml(`<span class="keys" style="width:${keyWidth} !important; border: 2px solid ${colorOption}"></span>`);
	};

	$scope.keyboard = [];
	$scope.numpad = [];

	let keys = [
		['30px', '30px', '30px', '30px', '30px', '30px', '30px', '30px', '30px', '30px', '30px', '30px', '30px', '30px'],
		['29.27px', '29.27px', '29.27px', '29.27px', '29.27px', '29.27px', '29.27px', '29.27px', '29.27px', '29.27px', '29.27px', '29.27px', '29.27px', '40px'], // diff 0.7px => 30px => 29.3px
		['40px', '29.27px', '29.27px', '29.27px', '29.27px', '29.27px', '29.27px', '29.27px', '29.27px', '29.27px', '29.27px', '29.27px', '29.27px', '29.27px'], // diff 0.7px => 30px => 29.3px
		['45px', '29.69px', '29.69px', '29.69px', '29.69px', '29.69px', '29.69px', '29.69px', '29.69px', '29.69px', '29.69px', '29.69px', '55px'], // diff 3.3px => 30px => 29.43px
		['60px', '30.3px', '30.3px', '30.3px', '30.3px', '30.3px', '30.3px', '30.3px', '30.3px', '30.3px', '30.3px', '70px'], // diff 0.15 => 30px => 29.85px
		['40px', '30px', '30px', '30px', '161px', '40px', '40px', '40px', '40px']
	];

	let keys_numpad = [
		['25px', '25px', '25px', '25px'],
		['25px', '25px', '25px', '25px'],
		['25px', '25px', '25px', '25px'],
		['25px', '25px', '25px', '25px'],
		['35px'],
		['35px', '35px', '35px']
	];

	keys_numpad.forEach(i => $scope.numpad.push(Object.assign({}, i)));
	keys.forEach(i => $scope.keyboard.push(Object.assign({}, i)));

});