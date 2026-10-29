import { test } from "node:test";
import assert from "node:assert/strict";
import { searchJobs, searchPosts } from "../src/lib/search";
import { jobs } from "../src/lib/data";
import {
  initialWorkspace,
  newApplication,
  removeStatus,
} from "../src/lib/workspace";
test("中金与 CICC 只关联已入库中金岗位，精准模式不扩展英文别名", () => {
  assert.deepEqual(
    searchJobs("中金").map((j) => j.company),
    ["中金公司"],
  );
  assert.equal(searchJobs("CICC").length, 1);
  assert.equal(searchJobs("CICC", true).length, 0);
  assert.equal(searchJobs("中金", true).length, 1);
});
test("四大词典和财务同义词只返回对应公司及岗位", () => {
  assert.deepEqual(
    new Set(searchJobs("四大").map((j) => j.company)),
    new Set(["普华永道", "德勤", "安永", "毕马威"]),
  );
  assert.equal(searchJobs("四大", true).length, 0);
  assert.equal(
    searchJobs("财务会计").some((j) => j.id === "tencent-finance"),
    true,
  );
  assert.equal(searchJobs("财务会计", true).length, 0);
});
test("空结果及跨内容关联", () => {
  assert.equal(searchJobs("不存在的公司").length, 0);
  assert.equal(searchPosts("CICC")[0].company, "中金公司");
  assert.equal(searchPosts("CICC", true).length, 0);
  assert.equal(new Set(searchJobs("").map((j) => j.id)).size, jobs.length);
});
test("转正岗位都有明确的条件性留用证据", () => {
  for (const j of jobs.filter((j) => j.category === "转正实习"))
    assert.match(j.retention || "", /机会/);
  for (const j of jobs.filter((j) => !j.retention))
    assert.notEqual(j.category, "转正实习");
});
test("加入工作台保留 JD 与邮箱，默认不会标记已投递", () => {
  const j = jobs[0],
    r = newApplication(j);
  assert.equal(r.email, j.email);
  assert.equal(r.company, j.company);
  assert.equal(r.deadline, j.deadline);
  assert.equal(r.jdUrl, `/jobs/${j.id}`);
  assert.equal(r.status, "s0");
  assert.equal(r.appliedAt, "");
});
test("删除状态迁移关联记录，不允许删除最后一个状态", () => {
  const result = removeStatus(initialWorkspace, "s3");
  assert.equal(
    result.statuses.some((s) => s.id === "s3"),
    false,
  );
  assert.equal(result.records[0].status, result.statuses[0].id);
  const single = {
    ...initialWorkspace,
    statuses: [initialWorkspace.statuses[0]],
  };
  assert.equal(removeStatus(single, "s0"), single);
});
