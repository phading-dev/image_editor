export class DarkTheme {
  public neutral0 = "rgb(242,242,242)";
  public neutral1 = "rgb(200,200,200)";
  public neutral2 = "rgb(130,130,130)";
  public neutral3 = "rgb(68,68,68)";
  public neutral4 = "rgb(34,34,34)";

  public accent0 = "rgb(97,218,251)";
  public accent1 = "rgb(29,155,240)";
  public accent2 = "rgb(0,119,255)";
  public accent3 = "rgb(0,82,204)";

  public error0 = "rgb(255,69,58)";
  public error1 = "rgb(255,59,48)";
  public error2 = "rgb(219,50,43)";
  public error3 = "rgb(186,33,39)";

  public selectionMaskAdd = "#00ff00";
  public selectionMaskSubtract = "#ff0000";
  public selectionMaskIntersect = "#ffff00";
}

export class LightTheme {
  public neutral0 = "rgb(32,32,32)";
  public neutral1 = "rgb(68,68,68)";
  public neutral2 = "rgb(130,130,130)";
  public neutral3 = "rgb(220,220,220)";
  public neutral4 = "rgb(248,248,248)";
  public neutralContrast0 = this.neutral4;

  public accent0 = "rgb(0,119,255)";
  public accent1 = "rgb(29,155,240)";
  public accent2 = "rgb(0,102,204)";
  public accent3 = "rgb(0,82,180)";

  public error0 = "rgb(220,53,47)";
  public error1 = "rgb(200,45,40)";
  public error2 = "rgb(180,40,35)";
  public error3 = "rgb(160,35,30)";

  public selectionMaskAdd = "#00cc00";
  public selectionMaskSubtract = "#cc0000";
  public selectionMaskIntersect = "#cccc00";
}

export let COLOR_THEME = new LightTheme();
