'use strict';

var angular = require('angular');
require('angular-route');
require('angular-material');
const { ipcRenderer } = require('electron');
const { SegmentBrightness, BacklightMode } = require('../driver/options');

const userProfilesStore = ipcRenderer.sendSync('getUserProfiles');

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
.controller('indexController', function ($scope, $sce, $mdDialog) {
	
	$scope.brightness = SegmentBrightness;
	$scope.colors = Colors;
	$scope.blMode = BacklightMode;
	
	$scope.selectedProfile = userProfilesStore.selectedProfile;
	$scope.userProfiles = userProfilesStore.profiles;

	$scope.keyboard = [];
	$scope.numpad = [];
	$scope.selectedSegment = 0;
	$scope.selectedBrightness = 3;
	$scope.backlightMode = 3;
	$scope.advancedBrightness = false;

	// Keys size config

	let keys = [
		['40px', '40px', '40px', '40px', '40px', '40px', '40px', '40px', '40px', '40px', '40px', '40px', '40px', '40px'],
		['38.87px', '38.87px', '38.87px', '38.87px', '38.87px', '38.87px', '38.87px', '38.87px', '38.87px', '38.87px', '38.87px', '38.87px', '38.87px', '55px'],
		['55px', '38.87px', '38.87px', '38.87px', '38.87px', '38.87px', '38.87px', '38.87px', '38.87px', '38.87px', '38.87px', '38.87px', '38.87px', '38.87px'],
		['75px', '38.9px', '38.9px', '38.9px', '38.9px', '38.9px', '38.9px', '38.9px', '38.9px', '38.9px', '38.9px', '38.9px', '67px'],
		['68px', '39.7px', '39.7px', '39.7px', '39.7px', '39.7px', '39.7px', '39.7px', '39.7px', '39.7px', '39.7px', '115px'],
		['55px', '47.5px', '47.5px', '47.5px', '222px', '47.5px', '47.5px', '47.5px', '47.5px']
	];

	let keys_numpad = [
		['35px', '35px', '35px', '35px'],
		['35px', '35px', '35px', '35px'],
		['35px', '35px', '35px', '35px'],
		['35px', '35px', '35px', '35px'],
		['48px'],
		['48px', '48px', '48px']
	];

	keys_numpad.forEach(i => $scope.numpad.push(Object.assign({}, i)));
	keys.forEach(i => $scope.keyboard.push(Object.assign({}, i)));

	// Keys size config END

	$scope.saveProfiles = () => {

		let profilesArray = Array.from($scope.userProfiles);
		profilesArray.forEach((i, x) => {
			if(x==$scope.selectedProfile) profilesArray[x].backlightMode = $scope.backlightMode;
			delete profilesArray[x]['$$hashKey'];
			profilesArray[x].profileOptions.forEach((ii, xx) => {
				delete profilesArray[x].profileOptions[xx]['$$hashkey'];
			});
		});

		let profiles = {
			selectedProfile: $scope.selectedProfile,
			profiles: profilesArray
		};
		ipcRenderer.send('saveProfiles', profiles);
	};

	$scope.applySettings = (backlightMode=null, profileOptions=null) => {
		if(backlightMode!=null&&profileOptions!=null)
			ipcRenderer.send('setKB', backlightMode, profileOptions);
		else
			ipcRenderer.send('setKB', $scope.backlightMode, $scope.segmentsOptions);

		$scope.saveProfiles();
	};

	// User profile and segment options

	const baseSegmentsOptions = [
		{ segmentColor: 0, segmentBrightness : $scope.brightness.HIGH },
		{ segmentColor: 0, segmentBrightness : $scope.brightness.HIGH },
		{ segmentColor: 0, segmentBrightness : $scope.brightness.HIGH },
		{ segmentColor: 0, segmentBrightness : $scope.brightness.HIGH }
	];

	if(userProfilesStore.selectedProfile!==undefined) {
		var userSelectedProfile = userProfilesStore.profiles[userProfilesStore.selectedProfile];
		$scope.applySettings(userSelectedProfile.backlightMode, userSelectedProfile.profileOptions);
	}
	
	$scope.segmentsOptions = userProfilesStore.selectedProfile!==undefined ? userSelectedProfile.profileOptions : baseSegmentsOptions;

	$scope.changeProfile = () => {
		$scope.segmentsOptions = userProfilesStore.profiles[$scope.selectedProfile].profileOptions;
		$scope.backlightMode = userProfilesStore.profiles[$scope.selectedProfile].backlightMode;
		$scope.applySettings();
	};

	$scope.addProfile = () => {
		
		let dialog = $mdDialog.prompt()
		.textContent('Write here the profile name')
		.placeholder('Profile name')
		.ariaLabel('Profile name')
		.required(true)
		.ok('Create')
		.cancel('Cancel');

		$mdDialog.show(dialog).then((result) => {
			$scope.userProfiles.push({profileName:result, profileOptions:$scope.segmentsOptions});
			$scope.selectedProfile = $scope.userProfiles.length-1;
			$scope.saveProfiles();
		}, () => {});

	};

	$scope.deleteProfile = () => {
		$scope.selectedProfile = $scope.userProfiles.length-2;
		$scope.changeProfile();
		$scope.userProfiles.splice($scope.selectedProfile+1, 1);
		$scope.saveProfiles();
	};

	$scope.renameProfile = () => {

		let dialog = $mdDialog.prompt()
		.textContent('Write here the new profile name')
		.placeholder('Profile name')
		.ariaLabel('Profile name')
		.required(true)
		.initialValue($scope.userProfiles[$scope.selectedProfile].profileName)
		.ok('Rename')
		.cancel('Cancel');

		$mdDialog.show(dialog).then((result) => {
			$scope.userProfiles[$scope.selectedProfile].profileName = result;
			$scope.saveProfiles();
		}, () => {});

	};

	// User profile and segment options END 

	// Segment Color
	
	$scope.selectSegmentColor = (index) => {
		$scope.segmentsOptions[$scope.selectedSegment] = { 
			...$scope.segmentsOptions[$scope.selectedSegment],
			segmentColor: index
		};
		$scope.userProfiles[$scope.selectedProfile].profileOptions = $scope.segmentsOptions;
		$scope.applySettings();
	};

	$scope.checkSelectedSegmentColor = (index) => {
		if($scope.segmentsOptions[$scope.selectedSegment]!=undefined)
			if($scope.segmentsOptions[$scope.selectedSegment].segmentColor==index)
				return true;
	};

	// Segment color END

	// Backlight style

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
		$scope.userProfiles[$scope.selectedProfile].backlightMode = $scope.backlightMode;
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

	// Backlight style END

	$scope.selectSegment = (keyRow, keyIndex, kOrN) => { let idx = getKeyRow(keyRow, keyIndex, kOrN); $scope.selectedSegment = idx; };
	$scope.getKey = (keyWidth, keyRow, keyIndex, kOrN) => {
		
		var boxShadowInner = '';
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

	// Brightness

	$scope.showHideAdvancedBrightnessOptions = () => {
		if($scope.advancedBrightness) $scope.advancedBrightness = false;
		else $scope.advancedBrightness = true;
	};

	$scope.changeAllSegmentBrightness = () => {
		$scope.segmentsOptions.forEach((item, idx) => {
			$scope.segmentsOptions[idx].segmentBrightness = $scope.selectedBrightness;
		});
		$scope.applySettings($scope.backlightMode, $scope.segmentsOptions);
	};

	// Brightness END

});