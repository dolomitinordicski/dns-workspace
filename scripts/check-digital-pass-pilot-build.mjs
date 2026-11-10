/** Fail-closed GitHub Pages pilot release guard. Never prints environment values. */
const requested=process.env.DNS_PILOT_REQUESTED==='true';
if(!requested) {
  if(process.env.DNS_PILOT_REQUESTED && process.env.DNS_PILOT_REQUESTED!=='false')throw Error('INVALID_PILOT_REQUEST');
  console.log('Digital Pass public activation disabled for ordinary deployments.');
  process.exit(0);
}
if(process.env.DNS_PASS_PILOT_APPROVED!=='true')throw Error('PILOT_APPROVAL_VARIABLE_REQUIRED');
const api=process.env.DNS_PASS_API_BASE||'';
const privacy=process.env.DNS_PASS_PRIVACY_URL||'';
let url,notice;
try{url=new URL(api);notice=new URL(privacy)}catch{throw Error('PILOT_URL_CONFIGURATION_REQUIRED')}
if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||url.pathname!=='/digitalPassApi'||
  !(/\\.cloudfunctions\\.net$/.test(url.hostname)||/\\.run\\.app$/.test(url.hostname)))
  throw Error('PILOT_API_URL_NOT_APPROVED');
if(/staging|demo/i.test(url.hostname))throw Error('SYNTHETIC_STAGING_NOT_FOR_REAL_PILOT');
if(notice.protocol!=='https:'||notice.username||notice.password||notice.hash)throw Error('PILOT_PRIVACY_URL_NOT_APPROVED');
console.log('Pilot frontend build gate validated; this does not verify API deploy, IAM, inventory or live connectivity.');
