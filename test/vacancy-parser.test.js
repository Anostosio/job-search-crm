import test from 'node:test';
import assert from 'node:assert/strict';
import {extractVacancyFromHtml,htmlToText} from '../lib/vacancy-parser.js';

test('extracts schema.org JobPosting fields without inventing missing data',()=>{
  const html=`<!doctype html><html><head><script type="application/ld+json">${JSON.stringify({
    '@context':'https://schema.org','@type':'JobPosting',title:'Brand Designer',
    hiringOrganization:{'@type':'Organization',name:'Acme Studio'},
    jobLocationType:'TELECOMMUTE',jobLocation:{address:{addressLocality:'Madrid',addressCountry:'ES'}},
    baseSalary:{currency:'EUR',value:{minValue:1800,maxValue:2300,unitText:'MONTH'}},
    description:'<p>Design identity systems &amp; digital campaigns.</p>'
  })}</script></head></html>`;
  const result=extractVacancyFromHtml(html,'https://careers.example.com/jobs/42');
  assert.equal(result.data.company,'Acme Studio');
  assert.equal(result.data.role,'Brand Designer');
  assert.equal(result.data.workMode,'remote');
  assert.match(result.data.salary,/1800–2300/);
  assert.match(result.data.description,/identity systems & digital campaigns/);
  assert.equal(result.data.source,'careers.example.com');
  assert.deepEqual(result.needsReview,[]);
});

test('uses meta title/description but leaves company empty when it is not supported',()=>{
  const html='<meta property="og:title" content="Graphic Designer"><meta name="description" content="Remote visual role">';
  const result=extractVacancyFromHtml(html,'https://jobs.example.org/open/1');
  assert.equal(result.data.role,'Graphic Designer');
  assert.equal(result.data.company,'');
  assert.equal(result.confidence.role,'meta');
  assert.ok(result.needsReview.includes('company'));
});

test('converts vacancy HTML to safe plain text',()=>{
  assert.equal(htmlToText('<p>Hello &amp; welcome</p><script>alert(1)</script>'),'Hello & welcome');
});
