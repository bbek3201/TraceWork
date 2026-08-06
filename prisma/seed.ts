import { PrismaClient, ProjectStatus, TaskStatus } from "@prisma/client";
import { hashPassword } from "../src/lib/password";
import type { AppRole } from "../src/lib/permissions";
import { ensureOrgRoles } from "../src/lib/roles";

const prisma = new PrismaClient();
const demoPasswordHash = hashPassword("Password123!");
const names = ["Бат-Оргил Б.","Нарантуяа Э.","Энхболд С.","Доржпалам Б.","Саруул М.","Отгонбат Г.","Мөнхбаатар А.","Болормаа Х.","Эрдэнэбат М.","Мөнхжаргал Д.","Сэлэнгэ Ц.","Нямдорж Д.","Төгөлдөр Н.","Энхзул Б.","Баатар Э.","Сүхбат Г.","Энхзориг Т.","Баттөр М.","Номин Э.","Ариунболд Д."];
const projectNames = ["River Garden","Sky Residence","Warehouse 02","Central Tower","Eco Residence"];
const taskNames = ["Суурийн арматур угсралт","3-р давхрын бетон цутгалт","Цахилгааны утас суурилуулалт","Гадна фасадын зураг батлуулах","Агуулахын үлдэгдэл шалгах","Бохир усны шугам угсрах","Халуун усны шугам турших","Бетоны чанарын дүгнэлт"];

async function main() {
  const organization = await prisma.organization.upsert({where:{slug:"nomad-construction"},update:{},create:{name:"Номад Констракшн",slug:"nomad-construction"}});
  const branches = await Promise.all(["Төв оффис","Sky Residence талбай","River Garden талбай"].map(name=>prisma.branch.upsert({where:{organizationId_name:{organizationId:organization.id,name}},update:{},create:{organizationId:organization.id,name}})));
  const departments = await Promise.all(["Удирдлага","Инженерчлэл","Талбай","Төсөв","ХАБЭА"].map(name=>prisma.department.upsert({where:{organizationId_name:{organizationId:organization.id,name}},update:{},create:{organizationId:organization.id,name}})));
  const roles = await ensureOrgRoles(organization.id);
  const members=[];
  for(let i=0;i<names.length;i++){
    const user=await prisma.user.upsert({where:{email:`employee${i+1}@evido.mn`},update:{},create:{email:`employee${i+1}@evido.mn`,name:names[i],passwordHash:demoPasswordHash}});
    const member=await prisma.organizationMember.upsert({where:{organizationId_userId:{organizationId:organization.id,userId:user.id}},update:{status:"ACTIVE"},create:{organizationId:organization.id,userId:user.id,status:"ACTIVE",branchId:branches[i%branches.length].id,departmentId:departments[i%departments.length].id,jobTitle:i<3?"Төслийн менежер":"Инженер"}});
    members.push({user,member});
  }
  async function setRole(memberId: string, roleName: AppRole) {
    const role = roles.get(roleName);
    if (!role) return;
    await prisma.userRole.upsert({
      where: { memberId_roleId: { memberId, roleId: role.id } },
      update: {},
      create: { memberId, roleId: role.id },
    });
  }
  await setRole(members[0].member.id, "ADMIN");
  await setRole(members[1].member.id, "MANAGER");
  await setRole(members[2].member.id, "HR");
  await setRole(members[3].member.id, "EXECUTIVE");
  await setRole(members[4].member.id, "TEAM_LEAD");
  const projects=[];
  for(let i=0;i<projectNames.length;i++) projects.push(await prisma.project.create({data:{organizationId:organization.id,departmentId:departments[i%departments.length].id,name:projectNames[i],status:i===2?ProjectStatus.AT_RISK:ProjectStatus.ACTIVE,progress:[78,54,31,66,71][i],startDate:new Date("2026-01-10"),dueDate:new Date("2026-12-20"),members:{create:members.slice(i,i+5).map(x=>({memberId:x.member.id}))}}}));
  const statuses=[TaskStatus.DRAFT,TaskStatus.ASSIGNED,TaskStatus.IN_PROGRESS,TaskStatus.BLOCKED,TaskStatus.WAITING,TaskStatus.SUBMITTED,TaskStatus.UNDER_REVIEW,TaskStatus.CHANGES_REQUIRED,TaskStatus.APPROVED,TaskStatus.REJECTED,TaskStatus.COMPLETED,TaskStatus.OVERDUE,TaskStatus.CANCELLED];
  const riskLevels=["LOW","LOW","MEDIUM","HIGH","CRITICAL"] as const;
  const createdTasks=[];
  for(let i=0;i<40;i++){
    const status=statuses[i%statuses.length];
    const isBlocked=status===TaskStatus.BLOCKED||status===TaskStatus.WAITING;
    const created=await prisma.task.create({data:{organizationId:organization.id,projectId:projects[i%projects.length].id,title:`${taskNames[i%taskNames.length]} ${Math.floor(i/taskNames.length)+1}`,description:"Гүйцэтгэлийг нотолгооны шаардлагын дагуу бүрэн хийнэ.",status,riskLevel:riskLevels[i%riskLevels.length],blockedReason:isBlocked?"WAITING_SUPPLIER":undefined,blockedNote:isBlocked?"Нийлүүлэгчээс материал хүлээгдэж байна.":undefined,priority:(i%4)+1,difficulty:(i%5)+1,basePoints:10+(i%5)*5,progress:(i*17)%101,dueAt:new Date(2026,7,(i%27)+1,17),createdById:members[0].user.id,assignees:{create:{memberId:members[(i+1)%members.length].member.id}},checklist:{create:[{title:"Ажлын талбайг шалгах"},{title:"Чанарын шаардлага баталгаажуулах"}]},requirements:{create:[{type:"PHOTO",title:"Гүйцэтгэлийн зураг"},{type:"GPS",title:"Байршлын баталгаа"}]}},include:{assignees:true}});
    createdTasks.push(created);
  }

  const highRiskTask=createdTasks.find(t=>t.riskLevel==="HIGH"&&t.assignees[0]);
  if(highRiskTask){
    const existingSubmission=await prisma.taskSubmission.findFirst({where:{taskId:highRiskTask.id}});
    if(!existingSubmission){
      await prisma.task.update({where:{id:highRiskTask.id},data:{status:"UNDER_REVIEW"}});
      const submission=await prisma.taskSubmission.create({data:{taskId:highRiskTask.id,version:1}});
      await prisma.taskReview.create({
        data:{submissionId:submission.id,reviewerId:members[4].user.id,decision:"APPROVED",reason:"Эхний шатны нотолгоо бүрэн байна."},
      });
    }
  }

  const scoredTask=createdTasks.find(t=>t.status===TaskStatus.COMPLETED&&t.assignees[0]);
  if(scoredTask){
    const existingScore=await prisma.taskScore.findUnique({where:{taskId:scoredTask.id}});
    if(!existingScore){
      const submission=await prisma.taskSubmission.upsert({
        where:{taskId_version:{taskId:scoredTask.id,version:1}},
        update:{},
        create:{taskId:scoredTask.id,version:1},
      });
      await prisma.taskReview.create({
        data:{submissionId:submission.id,reviewerId:members[1].user.id,decision:"APPROVED",qualityScore:5,reason:"Маш сайн гүйцэтгэл."},
      });
      await prisma.taskScore.create({
        data:{
          taskId:scoredTask.id,
          basePoint:scoredTask.basePoints,
          deadlineCoefficient:1,
          qualityCoefficient:1,
          evidenceCoefficient:1,
          finalScore:scoredTask.basePoints,
        },
      });
    }
  }

  const finishedTask=createdTasks.find(t=>t.status===TaskStatus.COMPLETED);
  const blockedOrDraftTask=createdTasks.find(t=>t.status===TaskStatus.DRAFT||t.status===TaskStatus.ASSIGNED);
  if(finishedTask&&blockedOrDraftTask){
    await prisma.taskDependency.upsert({
      where:{taskId_dependsOnTaskId:{taskId:blockedOrDraftTask.id,dependsOnTaskId:finishedTask.id}},
      update:{},
      create:{taskId:blockedOrDraftTask.id,dependsOnTaskId:finishedTask.id,dependencyType:"FINISH_TO_START"},
    });
  }
  const inProgressTask=createdTasks.find(t=>t.status===TaskStatus.IN_PROGRESS);
  const anotherDraftTask=createdTasks.find(t=>(t.status===TaskStatus.DRAFT||t.status===TaskStatus.ASSIGNED)&&t.id!==blockedOrDraftTask?.id);
  if(inProgressTask&&anotherDraftTask){
    await prisma.taskDependency.upsert({
      where:{taskId_dependsOnTaskId:{taskId:anotherDraftTask.id,dependsOnTaskId:inProgressTask.id}},
      update:{},
      create:{taskId:anotherDraftTask.id,dependsOnTaskId:inProgressTask.id,dependencyType:"FINISH_TO_START"},
    });
  }

  const handoverTask=createdTasks.find(t=>t.status===TaskStatus.WAITING&&t.assignees[0]);
  if(handoverTask){
    const fromMemberId=handoverTask.assignees[0].memberId;
    const toMember=members.find(m=>m.member.id!==fromMemberId);
    if(toMember){
      const existingHandover=await prisma.taskHandover.findFirst({where:{taskId:handoverTask.id}});
      if(!existingHandover){
        await prisma.taskAssignee.upsert({
          where:{taskId_memberId:{taskId:handoverTask.id,memberId:toMember.member.id}},
          update:{},
          create:{taskId:handoverTask.id,memberId:toMember.member.id},
        });
        await prisma.taskHandover.create({
          data:{
            taskId:handoverTask.id,
            fromMemberId,
            toMemberId:toMember.member.id,
            transferType:"TEMPORARY",
            note:"Ээлжийн амралттай холбоотой түр шилжүүлэг.",
            createdById:members[0].user.id,
          },
        });
      }
    }
  }

  const today = new Date(); today.setHours(0,0,0,0);
  for (let i = 0; i < 8; i++) {
    const late = i === 3;
    await prisma.attendance.upsert({
      where: { memberId_workDate: { memberId: members[i].member.id, workDate: today } },
      update: {},
      create: {
        organizationId: organization.id,
        memberId: members[i].member.id,
        workDate: today,
        checkInAt: new Date(today.getFullYear(), today.getMonth(), today.getDate(), late ? 9 : 8, late ? 20 : 3),
        checkOutAt: i < 4 ? new Date(today.getFullYear(), today.getMonth(), today.getDate(), 17, 10) : null,
        status: late ? "LATE" : "PRESENT",
      },
    });
  }

  const leaveTypes = ["ANNUAL", "SICK", "UNPAID"] as const;
  const leaveStatuses = ["PENDING", "APPROVED", "REJECTED"] as const;
  for (let i = 0; i < 3; i++) {
    await prisma.leaveRequest.create({
      data: {
        organizationId: organization.id,
        memberId: members[10 + i].member.id,
        leaveType: leaveTypes[i],
        startDate: new Date(2026, 7, 10 + i * 2),
        endDate: new Date(2026, 7, 12 + i * 2),
        reason: "Гэр бүлийн хэрэгтэй холбоотой",
        status: leaveStatuses[i],
        approvedById: leaveStatuses[i] !== "PENDING" ? members[0].user.id : undefined,
      },
    });
  }

  const products = [
    { name: "Арматур Ø16", sku: "MAT-0001", barcode: "4801234567890", unit: "ш", reorderPoint: 100, opening: 284 },
    { name: "Цемент M500", sku: "MAT-0002", barcode: "4801234567906", unit: "ш", reorderPoint: 300, opening: 1250 },
    { name: "Зэс кабель 3×2.5", sku: "MAT-0003", barcode: "4801234567913", unit: "м", reorderPoint: 100, opening: 78 },
    { name: "Хамгаалалтын малгай", sku: "MAT-0005", barcode: "4801234567920", unit: "ш", reorderPoint: 20, opening: 36 },
  ];
  const createdProducts=[];
  for (const p of products) {
    const product = await prisma.product.upsert({
      where: { organizationId_sku: { organizationId: organization.id, sku: p.sku } },
      update: {},
      create: { organizationId: organization.id, name: p.name, sku: p.sku, barcode: p.barcode, unit: p.unit, reorderPoint: p.reorderPoint },
    });
    createdProducts.push(product);
    const existingMovement = await prisma.stockMovement.findFirst({ where: { productId: product.id } });
    if (!existingMovement) {
      await prisma.stockMovement.create({
        data: { productId: product.id, type: "RECEIPT", quantity: p.opening, note: "Эхний үлдэгдэл", createdById: members[0].user.id },
      });
    }
  }

  const armature=createdProducts[0];
  const cement=createdProducts[1];
  if(armature&&cement){
    const po = await prisma.purchaseOrder.upsert({
      where: { organizationId_poNumber: { organizationId: organization.id, poNumber: "PO-1001" } },
      update: {},
      create: {
        organizationId: organization.id,
        poNumber: "PO-1001",
        supplierName: "Мон Материал ХХК",
        invoiceNumber: "INV-3321",
        status: "RECEIVED",
        createdById: members[0].user.id,
        items: {
          create: [
            { productId: armature.id, expectedQuantity: 500, invoiceQuantity: 500 },
            { productId: cement.id, expectedQuantity: 200, invoiceQuantity: 200 },
          ],
        },
      },
      include: { items: true },
    });

    const existingReceipt=await prisma.inventoryReceipt.findFirst({ where: { purchaseOrderId: po.id } });
    if(!existingReceipt){
      const armatureItem=po.items.find(i=>i.productId===armature.id)!;
      const cementItem=po.items.find(i=>i.productId===cement.id)!;
      await prisma.inventoryReceipt.create({
        data:{
          organizationId: organization.id,
          purchaseOrderId: po.id,
          receivedById: members[7].user.id,
          note: "Ачаа бүрэн ирсэн, зарим нь гэмтэлтэй.",
          items: {
            create: [
              { purchaseOrderItemId: armatureItem.id, productId: armature.id, expectedQuantity: 500, receivedQuantity: 497, damagedQuantity: 3, missingQuantity: 0, extraQuantity: 0 },
              { purchaseOrderItemId: cementItem.id, productId: cement.id, expectedQuantity: 200, receivedQuantity: 200, damagedQuantity: 0, missingQuantity: 0, extraQuantity: 0 },
            ],
          },
        },
      });
      await prisma.stockMovement.create({ data:{ productId: armature.id, type:"RECEIPT", quantity:497, note:`PO ${po.poNumber}`, createdById: members[7].user.id } });
      await prisma.stockMovement.create({ data:{ productId: cement.id, type:"RECEIPT", quantity:200, note:`PO ${po.poNumber}`, createdById: members[7].user.id } });
      await prisma.inventoryMismatch.create({
        data:{
          organizationId: organization.id,
          productId: armature.id,
          type:"DAMAGED",
          quantity:3,
          description:`PO ${po.poNumber}: гэмтэлтэй ирлээ (захиалсан 500, нэхэмжлэх 500, хүлээн авсан 497)`,
          sourceType:"THREE_WAY",
          sourceId: po.id,
        },
      });
    }

    const existingCount=await prisma.inventoryCount.findFirst({ where: { organizationId: organization.id, location: "Төв агуулах" } });
    if(!existingCount){
      const count=await prisma.inventoryCount.create({
        data:{
          organizationId: organization.id,
          location: "Төв агуулах",
          createdById: members[7].user.id,
          status: "COMPLETED",
          items:{
            create:[
              { productId: cement.id, systemQuantity: 1450, countedQuantity: 1442, difference: -8 },
            ],
          },
        },
      });
      await prisma.stockMovement.create({ data:{ productId: cement.id, type:"ADJUSTMENT", quantity:-8, note:"Тооллогын тохируулга", createdById: members[7].user.id } });
      await prisma.inventoryMismatch.create({
        data:{
          organizationId: organization.id,
          productId: cement.id,
          type:"MISSING",
          quantity:8,
          description:"Тооллого: систем 1450, тоолсон 1442",
          sourceType:"COUNT",
          sourceId: count.id,
        },
      });
    }
  }

  await prisma.taskTemplate.upsert({
    where: { organizationId_name: { organizationId: organization.id, name: "Бетон цутгалтын стандарт" } },
    update: {},
    create: {
      organizationId: organization.id,
      name: "Бетон цутгалтын стандарт",
      description: "Давхар бүрийн бетон цутгалтад ашиглах стандарт чеклист, нотолгооны шаардлага.",
      priority: 3,
      difficulty: 3,
      basePoints: 15,
      riskLevel: "HIGH",
      checklistItems: ["Хашлага, суурь бэлэн эсэхийг шалгах", "Арматурын байрлал баталгаажуулах", "Бетоны маркыг лабораторийн дүгнэлттэй тулгах", "Цутгалтын дараа гадаргууг тэгшлэх"],
      requirementItems: [
        { type: "PHOTO", title: "Цутгалтын өмнөх зураг" },
        { type: "PHOTO", title: "Цутгалтын дараах зураг" },
        { type: "DOCUMENT", title: "Лабораторийн дүгнэлт" },
      ],
      createdById: members[0].user.id,
    },
  });

  const notificationSeeds = [
    { userId: members[1].user.id, type: "task_assigned", title: "Шинэ ажил оноогдлоо", body: "Суурийн арматур угсралт 1", readAt: null },
    { userId: members[1].user.id, type: "task_reviewed", title: "Ажил батлагдлаа", body: null, readAt: new Date() },
    { userId: members[0].user.id, type: "leave_requested", title: "Чөлөөний хүсэлт ирлээ", body: null, readAt: null },
  ] as const;
  for (const n of notificationSeeds) {
    const existing = await prisma.notification.findFirst({ where: { organizationId: organization.id, userId: n.userId, title: n.title } });
    if (!existing) {
      await prisma.notification.create({
        data: { organizationId: organization.id, userId: n.userId, type: n.type, title: n.title, body: n.body ?? undefined, readAt: n.readAt ?? undefined },
      });
    }
  }

  console.log(`Seeded ${organization.name}: ${members.length} employees, ${projects.length} projects, 40 tasks, 8 attendance, 3 leave requests, ${products.length} products.`);
}

main().catch(console.error).finally(()=>prisma.$disconnect());
