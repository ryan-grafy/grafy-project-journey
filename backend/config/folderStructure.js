/**
 * NAS 프로젝트 폴더 표준 구조
 * 출처: .doc/backendgogo/folder_structure_spec.md
 */

const FOLDER_STRUCTURE = [
  {
    name: "##.최종 결과물",
    children: ["#발주서", "#송부파일", "#폰트"]
  },
  {
    name: "00. 계약서, 견적서, 마일스톤",
    children: [
      { name: "#견적서", children: ["#최종송부본"] },
      { name: "#계약서, 회사서류", children: ["#최종송부본"] },
      { name: "#마일스톤", children: ["#최종송부본"] },
      "#품의서, 지출결의서"
    ]
  },
  { name: "01. 송부 파일", children: [] },
  { name: "02. 작업물", children: [] },
  { name: "03. 수급 파일", children: [] },
  { name: "04. 기타", children: [] }
];

module.exports = FOLDER_STRUCTURE;
