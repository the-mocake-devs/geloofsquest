const CATEGORIES = ["Sacramenten","Bijbel","Jezus","Feesten","Tien geboden","Parabels","Symbolen","Wereldgodsdiensten"];
const response = await fetch('./questionsdata.json');
const questions = await response.json();
