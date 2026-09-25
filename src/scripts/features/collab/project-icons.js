const CV_PROJECT_ICON_COLORS=[
  {id:'blue',name:'蓝色'},
  {id:'orange',name:'橙色'},
  {id:'green',name:'绿色'},
  {id:'purple',name:'紫色'},
  {id:'teal',name:'青色'},
  {id:'rose',name:'玫红'}
];

function cvProjectIconColor(value){
  return CV_PROJECT_ICON_COLORS.some(function(color){return color.id===value;})?value:'blue';
}

function cvProjectFolderIcon(value){
  return '<svg class="pj-folder-icon pj-folder-icon--'+cvProjectIconColor(value)+'" viewBox="0 0 24 24" aria-hidden="true" focusable="false">'
    +'<path d="M3 6.5A2.5 2.5 0 0 1 5.5 4h4l2 2H18.5A2.5 2.5 0 0 1 21 8.5v9A2.5 2.5 0 0 1 18.5 20h-13A2.5 2.5 0 0 1 3 17.5z" fill="currentColor" fill-opacity=".16" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>'
    +'</svg>';
}

function cvProjectIconOptions(value,attribute){
  var selected=cvProjectIconColor(value);
  return CV_PROJECT_ICON_COLORS.map(function(color){
    return '<button type="button" class="pj-icon-option" '+attribute+'="'+color.id+'" aria-label="'+color.name+'文件夹" aria-pressed="'+(color.id===selected)+'" title="'+color.name+'文件夹">'
      +cvProjectFolderIcon(color.id)+'</button>';
  }).join('');
}

export { CV_PROJECT_ICON_COLORS, cvProjectFolderIcon, cvProjectIconColor, cvProjectIconOptions };
