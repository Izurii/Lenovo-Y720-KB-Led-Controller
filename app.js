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

app.config(['$routeProvider', function ($routeProvider) {
	
}])
.controller('indexController', function ($scope) {
	
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

	// 71 teclas iguais
	// 16 teclas numpad
	// 1 space
	// 1 shifts
	// 1 enter
	// 1 backspapce
	// 1 tab
	// 1 caps lock
	// 1 ctrl, alt gr, rec, ask and slash (right side) = 4

	// -----
	// 97 teclas



});